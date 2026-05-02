import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, ActivityIndicator,
  KeyboardAvoidingView, Platform
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { getInitials, getTimeAgo } from '../../lib/matching'

export default function ChatScreen() {
  const [conversations, setConversations] = useState<any[]>([])
  const [activeConv, setActiveConv] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [myId, setMyId] = useState<string>('')
  const scrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setMyId(user.id)
    })
    loadConversations()
    const timeout = setTimeout(() => setLoading(false), 5000)
    return () => clearTimeout(timeout)
  }, [])

  const loadConversations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          conversations (
            id, name, is_group, created_at
          )
        `)
        .eq('user_id', user.id)
      setConversations(data ?? [])
    } catch (error) {
      console.log('Chat error:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = useCallback(async (convId: string) => {
    const { data } = await supabase
      .from('messages')
      .select(`*, profiles (id, full_name, avatar_url)`)
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
    setMessages(data ?? [])
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)
  }, [])

  useEffect(() => {
    if (!activeConv) return
    loadMessages(activeConv.conversations.id)
    const channel = supabase
      .channel(`chat:${activeConv.conversations.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${activeConv.conversations.id}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new])
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [activeConv, loadMessages])

  const sendMessage = async () => {
    if (!input.trim() || !activeConv || sending) return
    const text = input.trim()
    setInput('')
    setSending(true)
    await supabase.from('messages').insert({
      conversation_id: activeConv.conversations.id,
      sender_id: myId,
      body: text,
    })
    setSending(false)
  }

  const startNewChat = async (name: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: conv } = await supabase
      .from('conversations')
      .insert({ name, is_group: false })
      .select()
      .single()
    if (!conv) return
    await supabase.from('conversation_participants').insert([
      { conversation_id: conv.id, user_id: user.id },
    ])
    await loadConversations()
  }

  if (activeConv) {
    return (
      <SafeAreaView style={s.container}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}>
          <View style={s.chatHeader}>
            <TouchableOpacity style={s.backBtn} onPress={() => setActiveConv(null)}>
              <Text style={s.backText}>←</Text>
            </TouchableOpacity>
            <View style={[s.chatAvatar, { backgroundColor: '#2a1e40' }]}>
              <Text style={s.chatAvatarText}>
                {getInitials(activeConv.conversations.name ?? 'CH')}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.chatHeaderName}>
                {activeConv.conversations.name ?? 'Chat'}
              </Text>
              <Text style={s.chatOnline}>Active now</Text>
            </View>
          </View>
          <ScrollView
            ref={scrollRef}
            style={s.messagesArea}
            contentContainerStyle={{ padding: 16, gap: 8 }}
            onContentSizeChange={() =>
              scrollRef.current?.scrollToEnd({ animated: true })
            }>
            {messages.length === 0 && (
              <View style={s.emptyChat}>
                <Text style={s.emptyChatText}>No messages yet. Say hello! 👋</Text>
              </View>
            )}
            {messages.map((m: any, i: number) => {
              const mine = m.sender_id === myId
              return (
                <View key={m.id ?? i} style={[s.bubbleWrap, mine && s.bubbleWrapMine]}>
                  {!mine && (
                    <Text style={s.senderName}>{m.profiles?.full_name ?? 'User'}</Text>
                  )}
                  <View style={[s.bubble, mine ? s.bubbleMine : s.bubbleThem]}>
                    <Text style={[s.bubbleText, mine && s.bubbleTextMine]}>{m.body}</Text>
                    <Text style={s.bubbleTime}>{getTimeAgo(m.created_at)}</Text>
                  </View>
                </View>
              )
            })}
          </ScrollView>
          <View style={s.inputRow}>
            <TextInput
              style={s.input}
              placeholder="Type a message..."
              placeholderTextColor="rgba(240,240,255,0.3)"
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[s.sendBtn, (!input.trim() || sending) && { opacity: 0.4 }]}
              onPress={sendMessage}
              disabled={!input.trim() || sending}>
              {sending
                ? <ActivityIndicator size="small" color="#a78bfa" />
                : <Text style={s.sendText}>➤</Text>
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Messages</Text>
        <TouchableOpacity
          style={s.composeBtn}
          onPress={() => startNewChat('New conversation')}>
          <Text style={s.composeText}>✏</Text>
        </TouchableOpacity>
      </View>
      <View style={s.searchBar}>
        <Text style={s.searchIcon}>🔍</Text>
        <TextInput
          placeholder="Search messages..."
          placeholderTextColor="rgba(240,240,255,0.3)"
          style={s.searchInput}
        />
      </View>
      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator color="#a78bfa" />
        </View>
      ) : conversations.length === 0 ? (
        <View style={s.emptyWrap}>
          <Text style={s.emptyIcon}>💬</Text>
          <Text style={s.emptyTitle}>No messages yet</Text>
          <Text style={s.emptyText}>Connect with students and start chatting!</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {conversations.map((c: any, i: number) => (
            <TouchableOpacity
              key={c.conversation_id ?? i}
              style={s.chatItem}
              onPress={() => setActiveConv(c)}>
              <View style={s.avatarWrap}>
                <View style={[s.avatar, { backgroundColor: '#2a1e40' }]}>
                  <Text style={s.avatarText}>
                    {getInitials(c.conversations?.name ?? 'CH')}
                  </Text>
                </View>
              </View>
              <View style={s.chatInfo}>
                <Text style={s.chatName}>{c.conversations?.name ?? 'Chat'}</Text>
                <Text style={s.chatPreview}>Tap to open conversation</Text>
              </View>
              <Text style={s.chatTime}>{getTimeAgo(c.conversations?.created_at)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d14' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: '#f0f0ff' },
  composeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(167,139,250,0.15)', borderWidth: 0.5, borderColor: 'rgba(167,139,250,0.3)', alignItems: 'center', justifyContent: 'center' },
  composeText: { fontSize: 16, color: '#a78bfa' },
  searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8, backgroundColor: '#1c1c2e', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, gap: 8, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)' },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 13, color: '#f0f0ff' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 10 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#f0f0ff' },
  emptyText: { fontSize: 13, color: 'rgba(240,240,255,0.4)', textAlign: 'center', lineHeight: 20 },
  chatItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.05)' },
  avatarWrap: { position: 'relative' },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  chatInfo: { flex: 1, minWidth: 0 },
  chatName: { fontSize: 14, fontWeight: '500', color: '#f0f0ff', marginBottom: 3 },
  chatPreview: { fontSize: 12, color: 'rgba(240,240,255,0.35)' },
  chatTime: { fontSize: 11, color: 'rgba(240,240,255,0.25)' },
  chatHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.07)' },
  backBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1c1c2e', alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 18, color: '#f0f0ff' },
  chatAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  chatAvatarText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  chatHeaderName: { fontSize: 14, fontWeight: '600', color: '#f0f0ff' },
  chatOnline: { fontSize: 11, color: '#34d399' },
  messagesArea: { flex: 1 },
  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyChatText: { fontSize: 14, color: 'rgba(240,240,255,0.3)', textAlign: 'center' },
  bubbleWrap: { flexDirection: 'column', marginBottom: 4 },
  bubbleWrapMine: { alignItems: 'flex-end' },
  senderName: { fontSize: 10, color: 'rgba(240,240,255,0.4)', marginBottom: 3, marginLeft: 4 },
  bubble: { maxWidth: '75%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleThem: { backgroundColor: '#1c1c2e', borderBottomLeftRadius: 4 },
  bubbleMine: { backgroundColor: 'rgba(167,139,250,0.2)', borderBottomRightRadius: 4, borderWidth: 0.5, borderColor: 'rgba(167,139,250,0.3)' },
  bubbleText: { fontSize: 13, color: 'rgba(240,240,255,0.7)', lineHeight: 20 },
  bubbleTextMine: { color: '#f0f0ff' },
  bubbleTime: { fontSize: 9, color: 'rgba(240,240,255,0.3)', marginTop: 4, textAlign: 'right' },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 10, borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.07)' },
  input: { flex: 1, backgroundColor: '#1c1c2e', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 13, color: '#f0f0ff', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)', maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(167,139,250,0.2)', borderWidth: 0.5, borderColor: 'rgba(167,139,250,0.3)', alignItems: 'center', justifyContent: 'center' },
  sendText: { fontSize: 16, color: '#a78bfa' },
})