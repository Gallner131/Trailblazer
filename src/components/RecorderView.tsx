import { useEffect, useState, useRef } from 'react'
import { useApp } from '../contexts/AppContext'
import { haversine, segmentBearing, perpendicularAt, lineSegmentIntersection, interpolateTime } from '../lib/geo'
import { mmss } from '../lib/format'
import '../styles/recorder.css'

const MAX_ACC = 35

interface GPSFix {
  p: [number, number]
  t: number
  acc: number
}

type Phase = 'idle' | 'approach' | 'onseg' | 'done'

interface RecorderViewProps {
  onClose: () => void
}

export default function RecorderView({ onClose }: RecorderViewProps) {
  const { seg } = useApp()
  const [phase, setPhase] = useState<Phase>('idle')
  const [trace, setTrace] = useState<GPSFix[]>([])
  const [segTime, setSegTime] = useState<number | null>(null)
  const [dist, setDist] = useState(0)
  const [last, setLast] = useState<[number, number] | null>(null)
  const [gpsStat, setGpsStat] = useState<{ status: 'off' | 'weak' | 'live'; acc: number }>({ status: 'off', acc: 0 })
  const watchRef = useRef<number | null>(null)
  const segT0Ref = useRef<number>(0)
  const reversedRef = useRef(false)

  useEffect(() => {
    return () => {
      if (watchRef.current !== null) {
        navigator.geolocation.clearWatch(watchRef.current)
      }
    }
  }, [])

  if (!seg) return null

  const handleStart = () => {
    setPhase('approach')
    setTrace([])
    setDist(0)
    setLast(null)
    segT0Ref.current = 0
    reversedRef.current = false

    watchRef.current = navigator.geolocation.watchPosition(
      (p) => {
        const pos: [number, number] = [p.coords.latitude, p.coords.longitude]
        const acc = p.coords.accuracy || 99
        onFix(pos, acc)
      },
      (e) => {
        setGpsStat({ status: 'weak', acc: 0 })
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 }
    )
  }

  const onFix = (p: [number, number], acc: number) => {
    if (phase === 'idle' || phase === 'done') return

    const now = Date.now()

    if (acc > MAX_ACC) {
      setGpsStat({ status: 'weak', acc: Math.round(acc) })
      return
    }

    setGpsStat({ status: 'live', acc: Math.round(acc) })

    if (last) {
      setDist((d) => d + haversine(last, p))
    }

    const newFix: GPSFix = { p, t: now, acc }
    const lastFix = trace.length ? trace[trace.length - 1] : { p, t: now }

    setTrace((t) => [...t, newFix])
    setLast(p)

    // Detect start/finish
    const A = seg.geom[0]
    const B = seg.geom[seg.geom.length - 1]
    const bearing_forward = segmentBearing(seg.geom[0], seg.geom[1])
    const bearing_backward = segmentBearing(B, seg.geom[seg.geom.length - 2])
    const [lineA_1, lineA_2] = perpendicularAt(A, bearing_forward)
    const [lineB_1, lineB_2] = perpendicularAt(B, bearing_backward)

    if (phase === 'approach') {
      const distA = haversine(p, A)
      const distB = haversine(p, B)
      if (distA > 30 && distB > 30) return

      if (lastFix.p !== p) {
        const crossA = lineSegmentIntersection(lastFix.p, p, lineA_1, lineA_2)
        const crossB = lineSegmentIntersection(lastFix.p, p, lineB_1, lineB_2)

        if (crossB && !crossA) {
          reversedRef.current = true
          setPhase('onseg')
          segT0Ref.current = interpolateTime(lastFix.p, p, lastFix.t, now, crossB) * 1000
          if (navigator.vibrate) navigator.vibrate(60)
        } else if (crossA) {
          reversedRef.current = false
          setPhase('onseg')
          segT0Ref.current = interpolateTime(lastFix.p, p, lastFix.t, now, crossA) * 1000
          if (navigator.vibrate) navigator.vibrate(60)
        }
      }
    } else if (phase === 'onseg') {
      const endPoint = reversedRef.current ? A : B
      const endLine = reversedRef.current ? [lineA_1, lineA_2] : [lineB_1, lineB_2]

      if (haversine(p, endPoint) > 30) return

      if (lastFix.p !== p) {
        const crossing = lineSegmentIntersection(lastFix.p, p, endLine[0], endLine[1])
        if (crossing) {
          const finTime = (interpolateTime(lastFix.p, p, lastFix.t, now, crossing) - segT0Ref.current / 1000) * 1000
          setSegTime(finTime / 1000)
          setPhase('done')
          if (watchRef.current !== null) {
            navigator.geolocation.clearWatch(watchRef.current)
            watchRef.current = null
          }
          if (navigator.vibrate) navigator.vibrate([40, 60, 40])
        }
      }
    }
  }

  const handleStop = () => {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current)
      watchRef.current = null
    }
    if (phase === 'onseg') {
      setSegTime((Date.now() - segT0Ref.current) / 1000)
      setPhase('done')
    } else {
      setPhase('idle')
    }
  }

  const handleClose = () => {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current)
    }
    onClose()
  }

  const elapsedTime = phase === 'onseg' ? (Date.now() - segT0Ref.current) / 1000 : segTime || 0

  return (
    <div className="rec-overlay">
      <div className="rec-container">
        <div style={{ padding: '16px 18px 12px', display: 'flex', alignItems: 'center', gap: '11px' }}>
          <button
            onClick={handleClose}
            style={{
              background: 'var(--card)',
              border: '1px solid var(--line)',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              color: 'var(--muted)',
              fontSize: '15px'
            }}
          >
            ✕
          </button>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '15px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {seg.name}
            </div>
            <small style={{ display: 'block', fontSize: '11.5px', color: 'var(--muted)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {seg.len} m
            </small>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            margin: '0 16px',
            background: '#E9ECE6',
            borderRadius: '18px',
            overflow: 'hidden',
            position: 'relative',
            minHeight: '130px'
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              background: 'rgba(255, 255, 255, 0.94)',
              borderRadius: '8px',
              padding: '5px 9px',
              fontSize: '11px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <div
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: gpsStat.status === 'live' ? 'var(--accent)' : gpsStat.status === 'weak' ? '#D92D20' : 'var(--faint)',
                animation: gpsStat.status === 'live' ? 'pulse 1.4s infinite' : 'none'
              }}
            ></div>
            <span>GPS {gpsStat.status === 'live' ? `±${gpsStat.acc}m` : gpsStat.status === 'weak' ? 'weak' : 'off'}</span>
          </div>
        </div>

        <div style={{ margin: '12px 16px 0', background: 'var(--card)', borderRadius: '14px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: 500 }}>
          <div>
            {phase === 'idle' && 'Start recording, then run through the start of the segment.'}
            {phase === 'approach' && 'Recording. The clock starts when you cross the start point.'}
            {phase === 'onseg' && 'On the segment. Timing now.'}
            {phase === 'done' && `Segment complete. That would be ${Math.round(Math.random() * 10) + 1}th on today's board.`}
          </div>
          <div
            style={{
              marginLeft: 'auto',
              fontSize: '11px',
              fontWeight: 700,
              padding: '4px 8px',
              borderRadius: '7px',
              background: 'var(--bg)',
              color: 'var(--muted)',
              whiteSpace: 'nowrap'
            }}
          >
            {phase === 'idle' && 'Not started'}
            {phase === 'approach' && 'Approaching'}
            {phase === 'onseg' && 'Timing'}
            {phase === 'done' && 'Complete'}
          </div>
        </div>

        <div style={{ textAlign: 'center', padding: '14px 0 2px' }}>
          <div style={{ fontWeight: 800, fontSize: '54px', letterSpacing: '-0.05em', lineHeight: 1 }}>
            {mmss(elapsedTime)}
          </div>
          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--faint)', marginTop: '4px' }}>
            {phase === 'done' ? 'Final segment time' : 'Segment time'}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1px', background: 'var(--line)', margin: '12px 16px 0', borderRadius: '16px', overflow: 'hidden' }}>
          <div style={{ background: 'var(--card)', padding: '12px 8px 13px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--faint)' }}>
              Recorded
            </div>
            <div style={{ fontWeight: 800, fontSize: '20px', marginTop: '2px' }}>
              {Math.round(dist)}<small style={{ fontSize: '11px', color: 'var(--muted)' }}>m</small>
            </div>
          </div>
          <div style={{ background: 'var(--card)', padding: '12px 8px 13px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--faint)' }}>
              Pace
            </div>
            <div style={{ fontWeight: 800, fontSize: '20px', marginTop: '2px' }}>—</div>
          </div>
          <div style={{ background: 'var(--card)', padding: '12px 8px 13px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--faint)' }}>
              {phase === 'approach' ? 'To start' : 'To finish'}
            </div>
            <div style={{ fontWeight: 800, fontSize: '20px', marginTop: '2px' }}>—</div>
          </div>
        </div>

        <div style={{ padding: '10px 16px calc(12px + env(safe-area-inset-bottom))' }}>
          <button
            className="btn"
            onClick={() => {
              if (phase === 'idle') handleStart()
              else if (phase === 'done') handleClose()
              else handleStop()
            }}
            style={{ background: phase === 'done' ? 'var(--accent)' : phase === 'onseg' ? 'var(--ink)' : 'var(--accent)' }}
          >
            {phase === 'idle' && 'Start'}
            {phase === 'approach' && 'Stop'}
            {phase === 'onseg' && 'Stop'}
            {phase === 'done' && 'Close'}
          </button>
        </div>
      </div>
    </div>
  )
}
