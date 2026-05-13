/**
 * app/feedback.tsx
 * Campus Voice — futuristic feedback board.
 * Schema lives in: supabase/migrations/20260512000000_feedback_and_comments.sql
 */
import React, {
  useEffect, useState, useCallback, useRef,
} from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl,
  KeyboardAvoidingView, Platform, Pressable,
} from 'react-native'
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming, withSpring,
} from 'react-native-reanimated'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import Toast from 'react-native-toast-message'
import { supabase } from '../lib/supabase'
import { getTimeAgo, getInitials } from '../lib/matching'
import { useTheme } from '../lib/theme'
import { typography } from '../lib/typography'
import { useAuthStore } from '../store/authStore'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FeedbackItem {
  id: string
  author_id: string
  body: string
  upvotes: number
  downvotes: number
  comments_count: number
  created_at: string
  myVote?: 1 | -1 | null
  profiles?: { full_name: string | null; avatar_url: string | null } | null
}

interface FeedbackComment {
  id: string
  author_id: string
  body: string
  created_at: string
  profiles?: { full_name: string | null } | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PURPLE        = '#a78bfa'
const PURPLE_DIM    = 'rgba(167,139,250,0.18)'
const PURPLE_BORDER = 'rgba(167,139,250,0.35)'
const PURPLE_GLOW   = 'rgba(167,139,250,0.22)'
const GREEN_DIM     = 'rgba(52,211,153,0.15)'
const RED_DIM       = 'rgba(248,113,113,0.15)'
const MAX_BODY      = 500

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, size = 32 }: { name: string | null | undefined; size?: number }) {
  const initials = getInitials(name ?? 'A')
  return (
    <View style={[av.circle, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[av.text, { fontSize: size * 0.36 }]}>{initials}</Text>
    </View>
  )
}

const av = StyleSheet.create({
  circle: {
    backgroundColor: PURPLE_DIM,
    borderWidth: 1,
    borderColor: PURPLE_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: PURPLE,
    fontFamily: typography.fontBold,
    letterSpacing: 0.5,
  },
})

// ─── Inline Comments Section ──────────────────────────────────────────────────

function CommentsSection({
  feedbackId,
  myId,
  theme,
}: {
  feedbackId: string
  myId: string
  theme: ReturnType<typeof useTheme>
}) {
  const [comments, setComments]   = useState<FeedbackComment[]>([])
  const [loading, setLoading]     = useState(true)
  const [newComment, setNewComment] = useState('')
  const [sending, setSending]     = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      const { data: cData } = await supabase
        .from('feedback_comments')
        .select('*')
        .eq('feedback_id', feedbackId)
        .order('created_at', { ascending: true })
        .limit(5)
      
      if (cData && cData.length > 0) {
        const uids = [...new Set(cData.map(c => c.author_id))]
        const { data: pData } = await supabase.from('profiles').select('id, full_name').in('id', uids)
        const pMap = new Map(pData?.map(p => [p.id, p]) ?? [])
        if (active) {
          setComments(cData.map(c => ({ ...c, profiles: pMap.get(c.author_id) ?? null })))
          setLoading(false)
        }
      } else if (active) {
        setComments([])
        setLoading(false)
      }
    })()
    return () => { active = false }
  }, [feedbackId])

  const handleSend = async () => {
    const text = newComment.trim()
    if (!text || !myId) return
    setSending(true)
    const { error } = await supabase.from('feedback_comments').insert({
      feedback_id: feedbackId,
      author_id: myId,
      body: text,
    })
    setSending(false)
    if (error) {
      Toast.show({ type: 'error', text1: 'Could not send', text2: error.message })
      return
    }
    setNewComment('')
    // Reload comments
    const { data: cData } = await supabase
      .from('feedback_comments')
      .select('*')
      .eq('feedback_id', feedbackId)
      .order('created_at', { ascending: true })
      .limit(5)
    
    if (cData) {
      const uids = [...new Set(cData.map(c => c.author_id))]
      const { data: pData } = await supabase.from('profiles').select('id, full_name').in('id', uids)
      const pMap = new Map(pData?.map(p => [p.id, p]) ?? [])
      setComments(cData.map(c => ({ ...c, profiles: pMap.get(c.author_id) ?? null })))
    }
  }

  return (
    <View style={[cs.wrap, { borderTopColor: PURPLE_BORDER }]}>
      {loading ? (
        <ActivityIndicator size="small" color={PURPLE} style={{ marginVertical: 8 }} />
      ) : comments.length === 0 ? (
        <Text style={[cs.empty, { color: theme.textFaint }]}>No comments yet</Text>
      ) : (
        comments.map(c => (
            <View style={[cs.row, c.author_id === myId && cs.rowMe]}>
              {c.author_id !== myId && <Avatar name={c.profiles?.full_name} size={28} />}
              <View style={[
                cs.bubble, 
                { backgroundColor: theme.card2 },
                c.author_id === myId ? cs.bubbleMe : cs.bubbleOther
              ]}>
                <View style={cs.bubbleHeader}>
                  <Text style={[cs.author, { color: PURPLE }]} numberOfLines={1}>
                    {c.author_id === myId ? 'You' : (c.profiles?.full_name ?? 'Anonymous')}
                  </Text>
                  <Text style={[cs.time, { color: theme.textFaint }]}>{getTimeAgo(c.created_at)}</Text>
                </View>
                <Text style={[cs.body, { color: theme.textMuted }]}>{c.body}</Text>
              </View>
            </View>
        ))
      )}

      {/* Comment compose */}
      <View style={cs.inputRow}>
        <TextInput
          style={[cs.input, { backgroundColor: theme.card2, color: theme.text, borderColor: PURPLE_BORDER }]}
          placeholder="Add a comment..."
          placeholderTextColor={theme.textFaint}
          value={newComment}
          onChangeText={setNewComment}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          editable={!sending}
        />
        <TouchableOpacity
          style={[cs.sendBtn, (!newComment.trim() || sending) && { opacity: 0.4 }]}
          onPress={handleSend}
          disabled={!newComment.trim() || sending}
        >
          <Ionicons name="send" size={14} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const cs = StyleSheet.create({
  wrap: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, gap: 8 },
  empty: { fontSize: 11, fontFamily: typography.fontRegular, textAlign: 'center', paddingVertical: 4 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 10 },
  rowMe: { flexDirection: 'row-reverse' },
  bubble: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.15)',
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  bubbleOther: {
    borderTopLeftRadius: 4,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
    borderBottomLeftRadius: 18,
    backgroundColor: 'rgba(167,139,250,0.05)',
  },
  bubbleMe: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 18,
    borderBottomLeftRadius: 18,
    backgroundColor: 'rgba(167,139,250,0.12)',
    borderColor: 'rgba(167,139,250,0.3)',
  },
  bubbleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 8 },
  author: { fontSize: 11, fontFamily: typography.fontBold },
  time: { fontSize: 9, fontFamily: typography.fontRegular },
  body: { fontSize: 13, fontFamily: typography.fontRegular, lineHeight: 19 },
  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 4 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    fontSize: 13,
    fontFamily: typography.fontRegular,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
})

// ─── Feedback Card ────────────────────────────────────────────────────────────

function FeedbackCard({
  item,
  myId,
  theme,
  onVote,
}: {
  item: FeedbackItem
  myId: string
  theme: ReturnType<typeof useTheme>
  onVote: (id: string, vote: 1 | -1) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const score = item.upvotes - item.downvotes
  const authorName = item.author_id === myId
    ? 'You'
    : (item.profiles?.full_name ?? 'Anonymous')

  return (
    <View style={[fc.card, { backgroundColor: theme.card }]}>
      {/* Top: avatar + author + time */}
      <View style={fc.topRow}>
        <Avatar name={item.profiles?.full_name} size={34} />
        <View style={{ flex: 1 }}>
          <Text style={[fc.authorName, { color: theme.text }]}>{authorName}</Text>
          <Text style={[fc.time, { color: theme.textFaint }]}>{getTimeAgo(item.created_at)}</Text>
        </View>
      </View>

      {/* Body */}
      <View style={fc.bodyWrap}>
        <Text style={[fc.body, { color: theme.textMuted }]}>{item.body}</Text>
      </View>

      {/* Actions row */}
      <View style={fc.actionsRow}>
        {/* Up vote */}
        <TouchableOpacity
          style={[fc.voteBtn, item.myVote === 1 && { backgroundColor: GREEN_DIM }]}
          onPress={() => onVote(item.id, 1)}
          accessibilityLabel="Upvote"
        >
          <Ionicons
            name="arrow-up"
            size={16}
            color={item.myVote === 1 ? '#34d399' : theme.textMuted}
          />
        </TouchableOpacity>

        <Text style={[fc.score, {
          color: score > 0 ? '#34d399' : score < 0 ? '#f87171' : theme.textMuted,
        }]}>
          {score}
        </Text>

        {/* Down vote */}
        <TouchableOpacity
          style={[fc.voteBtn, item.myVote === -1 && { backgroundColor: RED_DIM }]}
          onPress={() => onVote(item.id, -1)}
          accessibilityLabel="Downvote"
        >
          <Ionicons
            name="arrow-down"
            size={16}
            color={item.myVote === -1 ? '#f87171' : theme.textMuted}
          />
        </TouchableOpacity>

        {/* Comment pill */}
        <Pressable
          style={[fc.commentPill, expanded && { backgroundColor: PURPLE_DIM, borderColor: PURPLE_BORDER }]}
          onPress={() => setExpanded(e => !e)}
          accessibilityLabel={`${item.comments_count} comments`}
        >
          <Ionicons
            name={expanded ? 'chatbubble' : 'chatbubble-outline'}
            size={13}
            color={expanded ? PURPLE : theme.textFaint}
          />
          <Text style={[fc.commentCount, { color: expanded ? PURPLE : theme.textFaint }]}>
            {item.comments_count}
          </Text>
        </Pressable>
      </View>

      {/* Inline comments */}
      {expanded && (
        <CommentsSection feedbackId={item.id} myId={myId} theme={theme} />
      )}
    </View>
  )
}

const fc = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: PURPLE_BORDER,
    // Glow shadow
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
    gap: 10,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  authorName: { fontSize: 13, fontFamily: typography.fontSemiBold },
  time: { fontSize: 10, fontFamily: typography.fontRegular, marginTop: 1 },
  bodyWrap: { flexShrink: 1, paddingHorizontal: 2 },
  body: {
    fontSize: 14,
    fontFamily: typography.fontRegular,
    lineHeight: 22,
    marginVertical: 4,
    flexWrap: 'wrap',
  },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  voteBtn: {
    borderRadius: 12,
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  score: {
    fontSize: 14,
    fontFamily: typography.fontBold,
    minWidth: 24,
    textAlign: 'center',
  },
  commentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginLeft: 8,
  },
  commentCount: {
    fontSize: 12,
    fontFamily: typography.fontMedium,
  },
})

// ─── Compose Box ──────────────────────────────────────────────────────────────

function ComposeBox({
  myId,
  theme,
  insetBottom,
  onPosted,
}: {
  myId: string
  theme: ReturnType<typeof useTheme>
  insetBottom: number
  onPosted: () => void
}) {
  const [body, setBody]         = useState('')
  const [focused, setFocused]   = useState(false)
  const [sending, setSending]   = useState(false)

  // Border glow pulse on focus
  const glowOpacity = useSharedValue(0.35)
  useEffect(() => {
    if (focused) {
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.9, { duration: 800 }),
          withTiming(0.45, { duration: 800 }),
        ),
        -1,
        true,
      )
    } else {
      glowOpacity.value = withTiming(0.2, { duration: 400 })
    }
  }, [focused])

  const animBorderStyle = useAnimatedStyle(() => ({
    borderColor: `rgba(167,139,250,${glowOpacity.value})`,
    shadowOpacity: focused ? glowOpacity.value * 0.5 : 0,
  }))

  // Send button scale pulse while sending
  const btnScale = useSharedValue(1)
  const animBtnStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }))

  const handleSend = async () => {
    const text = body.trim()
    if (!text) return
    if (!myId) {
      Toast.show({ type: 'error', text1: 'Not identified', text2: 'Please wait for your session to load or log in again.' })
      return
    }
    if (text.length > MAX_BODY) {
      Toast.show({ type: 'error', text1: 'Too long', text2: `Max ${MAX_BODY} characters` })
      return
    }
    setSending(true)
    // Pulse animation
    btnScale.value = withRepeat(
      withSequence(withTiming(0.88, { duration: 200 }), withTiming(1, { duration: 200 })),
      -1,
      true,
    )

    const { error } = await supabase.from('feedbacks').insert({
      author_id: myId,
      body: text,
    })

    btnScale.value = withSpring(1)
    setSending(false)

    if (error) {
      Toast.show({ type: 'error', text1: 'Could not transmit', text2: error.message })
      return
    }
    setBody('')
    Toast.show({ type: 'success', text1: 'Transmission sent' })
    onPosted()
  }

  const remaining = MAX_BODY - body.length
  const overLimit = remaining < 0

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[
        cb.wrap,
        { backgroundColor: theme.cardSolid, borderTopColor: PURPLE_BORDER, paddingBottom: insetBottom + 12 },
      ]}>
        {/* Glow input */}
        <Animated.View style={[cb.inputWrap, animBorderStyle, {
          backgroundColor: theme.card2,
          shadowColor: PURPLE,
          shadowOffset: { width: 0, height: 0 },
          shadowRadius: 14,
          elevation: 0,
        }]}>
          <TextInput
            style={[cb.input, { color: theme.text }]}
            placeholder="Share your thoughts with the campus..."
            placeholderTextColor={theme.textFaint}
            value={body}
            onChangeText={setBody}
            multiline
            maxLength={MAX_BODY + 10}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            accessibilityLabel="Compose feedback"
          />
          <View style={cb.bottomRow}>
            <Text style={[cb.counter, { color: overLimit ? '#f87171' : theme.textFaint }]}>
              {remaining}
            </Text>
            <Animated.View style={animBtnStyle}>
              <TouchableOpacity
                style={[cb.sendBtn, (overLimit || sending || !body.trim()) && { opacity: 0.45 }]}
                onPress={handleSend}
                disabled={overLimit || sending || !body.trim()}
                accessibilityLabel="Send feedback"
              >
                {sending
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Ionicons name="arrow-forward" size={18} color="#fff" />}
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  )
}

const cb = StyleSheet.create({
  wrap: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  inputWrap: {
    borderRadius: 18,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
  },
  input: {
    fontSize: 14,
    fontFamily: typography.fontRegular,
    lineHeight: 20,
    minHeight: 52,
    maxHeight: 110,
    textAlignVertical: 'top',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  counter: {
    fontSize: 11,
    fontFamily: typography.fontRegular,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 10,
    elevation: 6,
  },
})

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ theme }: { theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={em.wrap}>
      <View style={em.iconRing}>
        <Ionicons name="radio-outline" size={34} color={PURPLE} />
      </View>
      <Text style={[em.title, { color: theme.text }]}>No Transmissions Yet</Text>
      <Text style={[em.sub, { color: theme.textFaint }]}>
        Be the first to broadcast your thoughts to the campus.
      </Text>
    </View>
  )
}

const em = StyleSheet.create({
  wrap: { alignItems: 'center', paddingTop: 72, paddingHorizontal: 32, gap: 14 },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: PURPLE_BORDER,
    backgroundColor: PURPLE_DIM,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 4,
  },
  title: { fontSize: 16, fontFamily: typography.fontBold, textAlign: 'center' },
  sub: { fontSize: 13, fontFamily: typography.fontRegular, textAlign: 'center', lineHeight: 19 },
})

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function FeedbackScreen() {
  const theme   = useTheme()
  const insets  = useSafeAreaInsets()
  const user    = useAuthStore(s => s.user)
  const myId    = user?.id ?? ''

  const [items, setItems]       = useState<FeedbackItem[]>([])
  const [loading, setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [tableError, setTableError] = useState(false)

  useEffect(() => {
    load()
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setTableError(false)

    const { data: { user } } = await supabase.auth.getUser()

    const { data: fData, error } = await supabase
      .from('feedbacks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(60)

    if (error) {
      if (error.code === '42P01') setTableError(true)
      else Toast.show({ type: 'error', text1: 'Load failed', text2: error.message })
      setLoading(false); setRefreshing(false)
      return
    }

    let hydrated = fData ?? []
    if (hydrated.length > 0) {
      const uids = [...new Set(hydrated.map(f => f.author_id))]
      const { data: pData } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', uids)
      const pMap = new Map(pData?.map(p => [p.id, p]) ?? [])
      hydrated = hydrated.map(f => ({ ...f, profiles: pMap.get(f.author_id) ?? null }))
    }

    // Fetch this user's votes in one query
    let myVotes: Record<string, 1 | -1> = {}
    if (user && hydrated.length > 0) {
      const { data: votes } = await supabase
        .from('feedback_votes')
        .select('feedback_id, vote')
        .eq('user_id', user.id)
        .in('feedback_id', hydrated.map((f: any) => f.id))
      for (const v of (votes ?? [])) myVotes[v.feedback_id] = v.vote
    }

    setItems(
      hydrated.map((f: any): FeedbackItem => ({ ...f, myVote: myVotes[f.id] ?? null }))
    )
    setLoading(false)
    setRefreshing(false)
  }, [])

  const handleVote = useCallback(async (feedbackId: string, vote: 1 | -1) => {
    if (!myId) return
    const item = items.find(f => f.id === feedbackId)
    if (!item) return

    const prevVote  = item.myVote
    const isSame    = prevVote === vote

    // Optimistic update
    setItems(prev => prev.map(f => {
      if (f.id !== feedbackId) return f
      let up   = f.upvotes
      let down = f.downvotes
      if (prevVote === 1)  up--
      if (prevVote === -1) down--
      if (!isSame) { if (vote === 1) up++; else down++ }
      return { ...f, upvotes: up, downvotes: down, myVote: isSame ? null : vote }
    }))

    if (isSame) {
      await supabase.from('feedback_votes').delete()
        .eq('feedback_id', feedbackId).eq('user_id', myId)
    } else {
      await supabase.from('feedback_votes').upsert(
        { user_id: myId, feedback_id: feedbackId, vote },
        { onConflict: 'user_id,feedback_id' },
      )
    }

    // Re-sync counts from DB
    const { data: fresh } = await supabase
      .from('feedback_votes').select('vote').eq('feedback_id', feedbackId)
    const up   = (fresh ?? []).filter((v: any) => v.vote === 1).length
    const down = (fresh ?? []).filter((v: any) => v.vote === -1).length
    setItems(prev => prev.map(f =>
      f.id === feedbackId ? { ...f, upvotes: up, downvotes: down } : f
    ))
  }, [myId, items])

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.bg }]} edges={['top']}>
      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[s.backBtn, { backgroundColor: theme.card, borderColor: PURPLE_BORDER }]}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={18} color={theme.text} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={[s.title, { color: theme.text }]}>Campus Voice</Text>
          {/* Purple glow accent line */}
          <View style={s.accentLine} />
        </View>
      </View>

      {/* ── Table missing warning ── */}
      {tableError && (
        <View style={[s.tableBanner, { backgroundColor: PURPLE_DIM, borderColor: PURPLE_BORDER }]}>
          <Ionicons name="warning-outline" size={16} color={PURPLE} />
          <Text style={[s.tableBannerText, { color: PURPLE }]}>
            Run the feedback migration to activate this feature.
          </Text>
        </View>
      )}

      {/* ── Feed ── */}
      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator color={PURPLE} size="large" />
          <Text style={[s.loadingText, { color: theme.textFaint }]}>Scanning transmissions...</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={f => f.id}
          renderItem={({ item }) => (
            <FeedbackCard
              item={item}
              myId={myId}
              theme={theme}
              onVote={handleVote}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load() }}
              tintColor={PURPLE}
            />
          }
          contentContainerStyle={[s.listContent, items.length === 0 && { flex: 1 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={!tableError ? <EmptyState theme={theme} /> : null}
        />
      )}

      {/* ── Compose box (always visible, pinned bottom) ── */}
      {!tableError && (
        <ComposeBox
          myId={myId}
          theme={theme}
          insetBottom={insets.bottom}
          onPosted={load}
        />
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: PURPLE_BORDER,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  title: {
    fontSize: 20,
    fontFamily: typography.fontBold,
    letterSpacing: 0.3,
  },
  accentLine: {
    marginTop: 4,
    height: 2,
    width: 48,
    borderRadius: 1,
    backgroundColor: PURPLE,
    // Glow
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },

  tableBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    margin: 16,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
  tableBannerText: {
    flex: 1,
    fontSize: 12,
    fontFamily: typography.fontMedium,
    lineHeight: 17,
  },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 13, fontFamily: typography.fontRegular },

  listContent: { padding: 16, paddingBottom: 8 },
})
