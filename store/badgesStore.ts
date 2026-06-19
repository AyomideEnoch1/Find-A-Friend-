import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../lib/supabase'

interface BadgesState {
  lastSeen: {
    home: string
    discover: string
    events: string
    chat: string
    academic: string
    clubs_feature: string
    anonymous: string
    vendors: string
    games: string
  }
  counts: {
    home: number
    discover: number
    events: number
    chat: number
    academic: number
    clubs_feature: number
    anonymous: number
    vendors: number
    games: number
  }
  markSeen: (tab: 'home' | 'discover' | 'events' | 'chat' | 'academic' | 'clubs_feature' | 'anonymous' | 'vendors' | 'games') => void
  syncCounts: () => Promise<void>
}

// Fallback to exactly 1 day ago for a clean initial state
const getInitialTime = () => new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

export const useBadgesStore = create<BadgesState>()(
  persist(
    (set, get) => ({
      lastSeen: {
        home: getInitialTime(),
        discover: getInitialTime(),
        events: getInitialTime(),
        chat: getInitialTime(),
        academic: getInitialTime(),
        clubs_feature: getInitialTime(),
        anonymous: getInitialTime(),
        vendors: getInitialTime(),
        games: getInitialTime(),
      },
      counts: {
        home: 0,
        discover: 0,
        events: 0,
        chat: 0,
        academic: 0,
        clubs_feature: 0,
        anonymous: 0,
        vendors: 0,
        games: 0,
      },
      markSeen: (tab) => {
        set((state) => ({
          lastSeen: {
            ...state.lastSeen,
            [tab]: new Date().toISOString(),
          },
          counts: {
            ...state.counts,
            [tab]: 0,
          },
        }))
      },
      syncCounts: async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) return

          const { lastSeen } = get()
          
          // Count new posts
          const p1 = supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .gt('created_at', lastSeen.home)
            .neq('author_id', user.id)

          // Count new clubs
          const p2 = supabase
            .from('clubs')
            .select('*', { count: 'exact', head: true })
            .gt('created_at', lastSeen.discover)
            .neq('created_by', user.id)

          // Count new events
          const p3 = supabase
            .from('events')
            .select('*', { count: 'exact', head: true })
            .gt('created_at', lastSeen.events)
            .neq('organizer_id', user.id)

          // Count new chat messages not sent by us
          // Note: we can't easily filter by "my conversations" without a join or nested query in head:true, 
          // so we'll do a simple select.
          // First, get my conversation ids
          const { data: myConvs } = await supabase
            .from('conversation_participants')
            .select('conversation_id')
            .eq('user_id', user.id)

          let chatCount = 0
          if (myConvs && myConvs.length > 0) {
            const convIds = myConvs.map(c => c.conversation_id)
            const { count } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .in('conversation_id', convIds)
              .gt('created_at', lastSeen.chat)
              .neq('sender_id', user.id)
            chatCount = count || 0
          }

          // Count feature badges
          const pAcademic = supabase.from('study_groups').select('*', { count: 'exact', head: true }).gt('created_at', lastSeen.academic)
          const pClubs = supabase.from('clubs').select('*', { count: 'exact', head: true }).gt('created_at', lastSeen.clubs_feature)
          const pAnon = supabase.from('anonymous_posts').select('*', { count: 'exact', head: true }).gt('created_at', lastSeen.anonymous)
          const pVendors = supabase.from('vendors').select('*', { count: 'exact', head: true }).gt('created_at', lastSeen.vendors)
          const pGames = supabase.from('game_sessions').select('*', { count: 'exact', head: true }).gt('created_at', lastSeen.games)

          const [res1, res2, res3, rAcad, rClubs, rAnon, rVendors, rGames] = await Promise.all([
            p1, p2, p3, pAcademic, pClubs, pAnon, pVendors, pGames
          ])

          set((state) => ({
            counts: {
              ...state.counts,
              home: res1.count || 0,
              discover: res2.count || 0,
              events: res3.count || 0,
              chat: chatCount,
              academic: rAcad.count || 0,
              clubs_feature: rClubs.count || 0,
              anonymous: rAnon.count || 0,
              vendors: rVendors.count || 0,
              games: rGames.count || 0,
            }
          }))

        } catch (error) {
          console.error("Failed to sync badge counts:", error)
        }
      }
    }),
    {
      name: 'faf-badges-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ lastSeen: state.lastSeen }), // Only persist lastSeen
    }
  )
)
