import { createClient } from '@supabase/supabase-js'

const SUPA_URL = 'https://ttrhmwjnegnbnovnwlzo.supabase.co'
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0cmhtd2puZWduYm5vdm53bHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYzMzk1NzgsImV4cCI6MjA1MTkxOTU3OH0.3j-5SqcPPZ-sPX7-m0d3K2qPPZ-sPX7-m0d3K2qPPZ8'

export const supabase = createClient(SUPA_URL, SUPA_KEY, {
  auth: {
    persistSession: true,
    detectSessionInUrl: true,
    autoRefreshToken: true,
    flowType: 'pkce'
  }
})

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string
          level: number
          home_cell: string | null
          created_at: string
        }
        Insert: {
          id: string
          display_name: string
          level?: number
          home_cell?: string | null
          created_at?: string
        }
      }
      segments: {
        Row: {
          id: string
          name: string
          cell: string
          distance_m: number
          geometry: Array<[number, number]>
          approved: boolean
          created_at: string
        }
      }
      runs: {
        Row: {
          id: string
          segment_id: string
          segment_name: string
          run_date: string
          runner_id: string
          seconds: number
          distance_m: number
          level: number
          ranked: boolean
          validated: boolean
          created_at: string
        }
      }
      collections: {
        Row: {
          runner_id: string
          segment_id: string
          first_collected: string
          best_seconds: number | null
        }
      }
      streaks: {
        Row: {
          runner_id: string
          current_streak: number
          longest_streak: number
          freezes_available: number
          last_active: string | null
        }
      }
    }
  }
}
