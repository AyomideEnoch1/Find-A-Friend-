import React from 'react'
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../lib/theme'
import { typography } from '../lib/typography'

export type AttachmentOptionKey = 'stickers' | 'camera' | 'gallery' | 'video'

export const ATTACHMENT_OPTIONS = [
  { icon: 'star-outline',     label: 'My Stickers', key: 'stickers' },
  { icon: 'camera-outline',   label: 'Camera',      key: 'camera'  },
  { icon: 'images-outline',   label: 'Gallery',     key: 'gallery' },
  { icon: 'videocam-outline', label: 'Video',       key: 'video'   },
] as const

interface AttachmentSheetProps {
  visible: boolean
  uploading?: boolean
  onClose: () => void
  onSelect: (key: AttachmentOptionKey) => void
}

export function AttachmentSheet({ visible, uploading, onClose, onSelect }: AttachmentSheetProps) {
  const theme = useTheme()
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={[s.sheet, { backgroundColor: theme.card2, borderColor: theme.accentBorder }]}>
        <View style={[s.handle, { backgroundColor: theme.border2 }]} />
        <Text style={[s.title, { color: theme.text }]}>Attach Media</Text>
        {uploading ? (
          <View style={s.uploadingRow}>
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={[s.uploadingText, { color: theme.textMuted }]}>Uploading…</Text>
          </View>
        ) : (
          <View style={s.grid}>
            {ATTACHMENT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.key}
                style={[s.optionCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => onSelect(opt.key as AttachmentOptionKey)}>
                <Ionicons name={opt.icon as any} size={28} color={theme.accent} />
                <Text style={[s.optionLabel, { color: theme.text }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={{ height: 30 }} />
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20,
    elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.2, shadowRadius: 20,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: 'center', marginBottom: 20,
  },
  title: {
    fontSize: 18, fontFamily: typography.fontBold,
    marginBottom: 20, textAlign: 'center',
  },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 12, justifyContent: 'center',
  },
  optionCard: {
    width: '45%', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 20, borderRadius: 16, borderWidth: 1, gap: 8,
  },
  optionLabel: {
    fontSize: 14, fontFamily: typography.fontSemiBold,
  },
  uploadingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 12, paddingVertical: 40,
  },
  uploadingText: {
    fontSize: 16, fontFamily: typography.fontMedium,
  },
})
