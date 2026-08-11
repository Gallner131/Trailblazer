import { createContext, useContext, useState } from 'react'
import { Candidate } from '../lib/segments'
import { ElevationData } from '../lib/elevation'

export interface Run {
  id: string
  segment_id: string
  segment_name: string
  run_date: string
  runner_id: string
  seconds: number
  distance_m: number
  level: number
  ranked: boolean
  created_at: string
}

export interface LeaderboardEntry {
  uid: string
  name: string
  t: number
  lvl: number
  d: number
  at: string
}

interface Segment extends Candidate {
  ele?: ElevationData
  area?: string
}

interface AppContextType {
  seg: Segment | null
  setSeg: (seg: Segment | null) => void
  board: LeaderboardEntry[]
  setBoard: (board: LeaderboardEntry[]) => void
  myEntry: LeaderboardEntry | null
  setMyEntry: (entry: LeaderboardEntry | null) => void
  dayKey: string
  dayIdx: number
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const now = new Date()
  const dayKey =
    now.getFullYear() +
    '-' +
    String(now.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(now.getDate()).padStart(2, '0')
  const DAY0 = Date.UTC(2026, 0, 1)
  const dayIdx = Math.floor((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - DAY0) / 864e5)

  const [seg, setSeg] = useState<Segment | null>(null)
  const [board, setBoard] = useState<LeaderboardEntry[]>([])
  const [myEntry, setMyEntry] = useState<LeaderboardEntry | null>(null)

  return (
    <AppContext.Provider
      value={{
        seg,
        setSeg,
        board,
        setBoard,
        myEntry,
        setMyEntry,
        dayKey,
        dayIdx
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
