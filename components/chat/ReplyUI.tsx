import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../lib/theme'
import { typography } from '../../lib/typography'

export interface ReplyPayload {
  _type: 'reply'
  replyTo: {
    id: string
    author: string
    body: string
  }
  text: string
}

export function parseReply(body: string): ReplyPayload | null {
  try {
    const obj = JSON.parse(body)
    if (obj?._type === 'reply' && obj.replyTo) return obj as ReplyPayload
    return null
  } catch {
    return null
  }
}

export function ReplyBanner({ replyingTo, onCancel }: { replyingTo: ReplyPayload['replyTo'] | null; onCancel: () => void }) {
  const theme = useTheme()
  if (!replyingTo) return null

  return (
    <View style={[styles.bannerWrap, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
      <View style={[styles.bannerInner, { backgroundColor: theme.bg, borderLeftColor: theme.accent }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.bannerAuthor, { color: theme.accent }]}>{replyingTo.author}</Text>
          <Text style={[styles.bannerBody, { color: theme.textFaint }]} numberOfLines={1}>{replyingTo.body}</Text>
        </View>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} hitSlop={10}>
          <Ionicons name="close" size={18} color={theme.textFaint} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

export function QuotedBubble({ replyTo, onPress }: { replyTo: ReplyPayload['replyTo']; onPress?: () => void }) {
  const theme = useTheme()
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[styles.quotedWrap, { backgroundColor: 'rgba(0,0,0,0.1)', borderLeftColor: theme.accent }]}
    >
      <Text style={[styles.bannerAuthor, { color: theme.accent }]}>{replyTo.author}</Text>
      <Text style={[styles.bannerBody, { color: theme.text }]} numberOfLines={3}>{replyTo.body}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  bannerWrap: {
    paddingHorizontal: 8,
    paddingTop: 8,
    borderTopWidth: 0.5,
  },
  bannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  bannerAuthor: {
    fontSize: 13,
    fontFamily: typography.fontBold,
    marginBottom: 2,
  },
  bannerBody: {
    fontSize: 12,
    fontFamily: typography.fontRegular,
  },
  cancelBtn: {
    padding: 4,
  },
  quotedWrap: {
    borderRadius: 8,
    padding: 8,
    borderLeftWidth: 4,
    marginBottom: 4,
  }
})
