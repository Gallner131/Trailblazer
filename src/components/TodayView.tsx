import { useState } from 'react'
import { useApp } from '../contexts/AppContext'
import { useAuth } from '../contexts/AuthContext'
import RecorderView from './RecorderView'
import '../styles/today.css'

const LEVELS = [
  { id: 0, name: 'New', hex: '#12B76A', pace: 390 },
  { id: 1, name: 'Steady', hex: '#2E90FA', pace: 315 },
  { id: 2, name: 'Quick', hex: '#F79009', pace: 255 },
  { id: 3, name: 'Elite', hex: '#7A5AF8', pace: 205 }
]

export default function TodayView() {
  const { seg, board } = useApp()
  const { user, signOut } = useAuth()
  const [level, setLevel] = useState(1)
  const [showRecorder, setShowRecorder] = useState(false)

  if (!seg) return null

  const targetTime = LEVELS[level].pace * (seg.len / 1000)

  return (
    <>
      <div className="phone">
        <div style={{ padding: '18px 20px 12px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid transparent', transition: 'border-color 0.2s' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '21px', letterSpacing: '-0.02em' }}>Today</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 500, marginTop: '1px' }}>
              {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <button
              onClick={signOut}
              style={{
                background: 'var(--card)',
                border: '1px solid var(--line)',
                borderRadius: '999px',
                padding: '7px 12px',
                fontWeight: 700,
                fontSize: '12.5px',
                cursor: 'pointer'
              }}
            >
              Sign out
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 118px' }}>
          {/* Segment card */}
          <div style={{ background: 'var(--card)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(14,17,22,.05)', marginBottom: '14px' }}>
            <div style={{ padding: '16px' }}>
              <h2 style={{ margin: '0 0 3px', fontWeight: 800, fontSize: '23px', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                {seg.name}
              </h2>
              <p style={{ margin: '0 0 14px', fontSize: '13px', color: 'var(--muted)', fontWeight: 500 }}>
                {seg.highway.replace(/_/g, ' ')} · OSM way {seg.id}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderTop: '1px solid var(--line)', paddingTop: '13px' }}>
                <div style={{ borderRight: '1px solid var(--line)', paddingRight: '10px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--faint)', marginBottom: '3px' }}>
                    Length
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '16px' }}>
                    {seg.len}<small style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', marginLeft: '2px' }}>m</small>
                  </div>
                </div>
                <div style={{ borderRight: '1px solid var(--line)', paddingRight: '10px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--faint)', marginBottom: '3px' }}>
                    Surface
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '16px' }}>{seg.surface}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--faint)', marginBottom: '3px' }}>
                    Climb
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '16px' }}>
                    {seg.ele?.up ? (
                      <>
                        {seg.ele.up}<small style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', marginLeft: '2px' }}>m</small>
                      </>
                    ) : (
                      <small style={{ color: 'var(--faint)' }}>—</small>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Level selector */}
          <div style={{ background: 'var(--card)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(14,17,22,.05)', marginBottom: '14px' }}>
            <div style={{ padding: '16px' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 700 }}>Your level</h3>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
                {LEVELS.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setLevel(l.id)}
                    style={{
                      flex: 1,
                      border: level === l.id ? `1.5px solid ${l.hex}` : '1.5px solid var(--line)',
                      background: level === l.id ? `color-mix(in srgb, ${l.hex} 8%, #fff)` : 'var(--card)',
                      borderRadius: '12px',
                      padding: '9px 4px 8px',
                      cursor: 'pointer',
                      transition: '0.14s'
                    }}
                  >
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', margin: '0 auto 5px', background: l.hex }}></div>
                    <div style={{ fontSize: '11.5px', fontWeight: 700, color: level === l.id ? 'var(--ink)' : 'var(--muted)' }}>
                      {l.name}
                    </div>
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '40px', letterSpacing: '-0.045em', lineHeight: 0.95 }}>
                    {Math.floor(targetTime / 60)}:{String(Math.round(targetTime % 60)).padStart(2, '0')}
                  </div>
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--muted)', fontWeight: 500 }}>
                  target for <b style={{ color: 'var(--ink)' }}>{LEVELS[level].name}</b>
                </div>
              </div>
            </div>
          </div>

          {/* Leaderboard preview */}
          <div style={{ background: 'var(--card)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(14,17,22,.05)' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid var(--line)' }}>
              <h3 style={{ margin: '0', fontSize: '14px', fontWeight: 700 }}>Leaderboard</h3>
            </div>
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {board.length === 0 ? (
                <div style={{ padding: '30px 22px', textAlign: 'center', color: 'var(--muted)', fontSize: '13.5px' }}>
                  <b style={{ display: 'block', fontWeight: 800, color: 'var(--ink)', marginBottom: '5px' }}>No times yet today</b>
                  Record it and you'll be first on the board.
                </div>
              ) : (
                board.slice(0, 6).map((entry, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '10px 16px', borderTop: '1px solid var(--line)' }}>
                    <div style={{ width: '22px', fontSize: '13px', fontWeight: 700, color: 'var(--faint)', textAlign: 'center' }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600 }}>{entry.name || 'Runner'}</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--faint)', fontWeight: 500, marginTop: '1px' }}>
                        {LEVELS[entry.lvl]?.name || '—'}
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '15.5px' }}>
                      {Math.floor(entry.t / 60)}:{String(Math.round(entry.t % 60)).padStart(2, '0')}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '12px 16px 10px', background: 'linear-gradient(to top, var(--bg) 62%, rgba(243, 244, 246, 0))' }}>
          <button className="btn" onClick={() => setShowRecorder(true)}>
            Record run
          </button>
        </div>
      </div>

      {showRecorder && <RecorderView onClose={() => setShowRecorder(false)} />}
    </>
  )
}
