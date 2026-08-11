import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useApp } from '../contexts/AppContext'
import { supabase } from '../db/config'
import { fetchSegments, buildCandidates, pickToday, Candidate } from '../lib/segments'
import { fetchElevation } from '../lib/elevation'
import { cellOf } from '../lib/format'
import TodayView from '../components/TodayView'
import '../styles/home.css'

type Phase = 'loading' | 'location' | 'discovery' | 'ready' | 'error'

export default function HomeScreen() {
  const { user, signOut } = useAuth()
  const { setSeg, dayKey } = useApp()
  const [phase, setPhase] = useState<Phase>('loading')
  const [statusMsg, setStatusMsg] = useState('')
  const [error, setError] = useState<{ title: string; detail: string } | null>(null)

  const initialize = async () => {
    try {
      setPhase('location')
      setStatusMsg('Getting your location…')

      // Get location
      const position = await new Promise<GeolocationCoordinates>((res, rej) => {
        navigator.geolocation.getCurrentPosition(
          (p) => res(p.coords),
          (e) => rej(e),
          { enableHighAccuracy: true, timeout: 15000 }
        )
      })

      const pos: [number, number] = [position.latitude, position.longitude]
      const cell = cellOf(pos[0], pos[1])

      // Fetch segments
      setPhase('discovery')
      const res = await fetchSegments(pos[0], pos[1], 700, (msg) => setStatusMsg(msg))

      const cands = buildCandidates(res.elements)
      if (!cands.length) {
        setError({
          title: 'No usable segments nearby',
          detail: `OpenStreetMap returned ${res.elements.length} named ways, but none were between 100 m and 1000 m long.`
        })
        setPhase('error')
        return
      }

      // Pick today's segment
      const seg: any = pickToday(cands, cell, dayKey)

      // Fetch elevation
      setStatusMsg('Reading the elevation profile…')
      const ele = await fetchElevation(seg.geom)
      if (ele) seg.ele = ele

      setSeg(seg)
      setPhase('ready')
    } catch (err: any) {
      console.error('Init error:', err)
      setError({
        title: 'Oops',
        detail: err?.message || String(err)
      })
      setPhase('error')
    }
  }

  useEffect(() => {
    initialize()
  }, [])

  if (phase === 'loading' || phase === 'location' || phase === 'discovery') {
    return (
      <div className="phone">
        <div className="gate">
          <div className="spin"></div>
          <p>{statusMsg}</p>
        </div>
      </div>
    )
  }

  if (phase === 'error' && error) {
    return (
      <div className="phone">
        <div className="gate">
          <h2>{error.title}</h2>
          <div className="errbox">{error.detail}</div>
          <button
            className="btn"
            onClick={initialize}
            style={{ marginBottom: '8px' }}
          >
            Try again
          </button>
          <button
            className="btn"
            style={{ background: 'var(--ink)' }}
            onClick={signOut}
          >
            Sign out
          </button>
        </div>
      </div>
    )
  }

  return <TodayView />
}
