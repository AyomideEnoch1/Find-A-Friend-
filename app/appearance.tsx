import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useThemeStore } from '../store/themeStore'
import { useTheme } from '../lib/theme'
import { typography } from '../lib/typography'

export default function AppearanceScreen() {
  const { mode, setMode, accent, setAccent } = useThemeStore()
  const theme = useTheme()
  const [previewTab, setPreviewTab] = useState<'chat' | 'ui'>('chat')

  const themes = [
    {
      label: 'Light',
      icon: '☀️',
      value: 'light' as const,
      description: 'Clean light layout — perfect for daytime',
      active: mode === 'light',
      onPress: () => setMode('light'),
    },
    {
      label: 'Dark',
      icon: '🌑',
      value: 'dark' as const,
      description: 'Deep dark — easy on the eyes',
      active: mode === 'dark',
      onPress: () => setMode('dark'),
    },
    {
      label: 'Darker',
      icon: '⬛',
      value: 'darker' as const,
      description: 'AMOLED black — maximum contrast',
      active: mode === 'darker',
      onPress: () => setMode('darker'),
    },
  ]

  const accents = [
    {
      name: 'purple' as const,
      label: 'Royal Purple',
      colors: ['#c4b5fd', '#8b5cf6'] as const,
      description: 'Default premium highlight'
    },
    {
      name: 'blue' as const,
      label: 'Neon Blue',
      colors: ['#93c5fd', '#2563eb'] as const,
      description: 'Sleek futuristic cyber blue'
    },
    {
      name: 'green' as const,
      label: 'Emerald Green',
      colors: ['#6ee7b7', '#059669'] as const,
      description: 'Fresh and energetic mint'
    },
    {
      name: 'orange' as const,
      label: 'Sunset Orange',
      colors: ['#fdba74', '#ea580c'] as const,
      description: 'Warm and creative orange'
    },
    {
      name: 'pink' as const,
      label: 'Rose Pink',
      colors: ['#f9a8d4', '#db2777'] as const,
      description: 'Vibrant modern aesthetic'
    },
    {
      name: 'yellow' as const,
      label: 'Cyber Yellow',
      colors: ['#fde047', '#d97706'] as const,
      description: 'High-contrast golden amber'
    }
  ]

  const activeThemeObj = themes.find(t => t.active) || themes[1]

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.bg }]} edges={['top', 'bottom']}>
      <View style={[s.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity style={[s.backBtn, { backgroundColor: theme.card }]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={[s.title, { color: theme.text }]}>Appearance</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ padding: 16, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[s.sectionLabel, { color: theme.textMuted }]}>Theme</Text>

        {/* Beautified segmented select */}
        <View style={[s.selectorContainer, { backgroundColor: theme.card2, borderColor: theme.border }]}>
          {themes.map(t => (
            <TouchableOpacity
              key={t.value}
              style={[
                s.selectorTab,
                t.active && {
                  backgroundColor: theme.cardSolid,
                  borderColor: theme.border,
                }
              ]}
              onPress={t.onPress}
              activeOpacity={0.8}
            >
              <Text style={s.selectorIcon}>{t.icon}</Text>
              <Text style={[
                s.selectorText,
                { color: t.active ? theme.accent : theme.textMuted }
              ]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[s.descriptionText, { color: theme.textMuted }]}>
          {activeThemeObj.description}
        </Text>

        <Text style={[s.sectionLabel, { color: theme.textMuted, marginTop: 12 }]}>Accent Color</Text>

        {/* Dynamic Grid of Accents */}
        <View style={s.accentGrid}>
          {accents.map(acc => {
            const isActive = accent === acc.name
            return (
              <TouchableOpacity
                key={acc.name}
                style={[
                  s.accentCard,
                  { 
                    backgroundColor: theme.card, 
                    borderColor: isActive ? theme.accent : theme.border,
                  }
                ]}
                onPress={() => setAccent(acc.name)}
                activeOpacity={0.8}
              >
                <View style={s.accentCardContent}>
                  <LinearGradient
                    colors={acc.colors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={s.accentColorDot}
                  >
                    {isActive && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.accentTitle, { color: theme.text }]} numberOfLines={1}>
                      {acc.label}
                    </Text>
                    <Text style={[s.accentDesc, { color: theme.textMuted }]} numberOfLines={2}>
                      {acc.description}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Dynamic Theme Preview Widget */}
        <Text style={[s.sectionLabel, { color: theme.textMuted, marginTop: 12 }]}>Preview</Text>
        <View style={[s.previewWidget, { backgroundColor: theme.bg, borderColor: theme.border }]}>
          
          {/* Tabs Selector for Preview */}
          <View style={[s.previewTabsRow, { borderBottomColor: theme.border }]}>
            <TouchableOpacity 
              style={[
                s.previewTabBtn, 
                previewTab === 'chat' && { borderBottomColor: theme.accent }
              ]}
              onPress={() => setPreviewTab('chat')}
            >
              <Text style={[
                s.previewTabBtnText, 
                { color: previewTab === 'chat' ? theme.accent : theme.textMuted }
              ]}>
                Chat
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                s.previewTabBtn, 
                previewTab === 'ui' && { borderBottomColor: theme.accent }
              ]}
              onPress={() => setPreviewTab('ui')}
            >
              <Text style={[
                s.previewTabBtnText, 
                { color: previewTab === 'ui' ? theme.accent : theme.textMuted }
              ]}>
                UI Components
              </Text>
            </TouchableOpacity>
          </View>

          {previewTab === 'chat' ? (
            <View style={{ gap: 12 }}>
              {/* Header */}
              <View style={[s.previewHeader, { borderBottomColor: theme.border }]}>
                <View style={s.previewUserRow}>
                  <View style={[s.previewAvatar, { backgroundColor: theme.accentBg }]}>
                    <Text style={[s.previewAvatarText, { color: theme.accent }]}>JD</Text>
                  </View>
                  <View>
                    <Text style={[s.previewUsername, { color: theme.text }]}>John Doe</Text>
                    <Text style={[s.previewUserStatus, { color: theme.success }]}>● Online</Text>
                  </View>
                </View>
                <Ionicons name="call" size={16} color={theme.accent} />
              </View>

              {/* Messages */}
              <View style={s.previewChatBody}>
                <View style={[s.previewBubbleFriend, { backgroundColor: theme.card }]}>
                  <Text style={[s.previewBubbleText, { color: theme.text }]}>
                    Hey! Are we still playing pool in the game lobby today? 🎱
                  </Text>
                  <Text style={[s.previewBubbleTime, { color: theme.textFaint }]}>11:32 AM</Text>
                </View>

                <View style={[s.previewBubbleSelf, { backgroundColor: theme.accent }]}>
                  <Text style={[s.previewBubbleText, { color: '#fff' }]}>
                    Definitely! Meet you there in 10 mins. 🚀
                  </Text>
                  <Text style={[s.previewBubbleTime, { color: 'rgba(255,255,255,0.7)' }]}>11:33 AM</Text>
                </View>
              </View>

              {/* Input Area */}
              <View style={[s.previewInputArea, { borderTopColor: theme.border }]}>
                <View style={[s.previewInput, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={{ color: theme.textMuted, fontSize: 11 }}>Write a message...</Text>
                </View>
                <View style={[s.previewSendBtn, { backgroundColor: theme.accent }]}>
                  <Ionicons name="send" size={10} color="#fff" />
                </View>
              </View>
            </View>
          ) : (
            <View style={s.previewUiContainer}>
              {/* Buttons Row */}
              <Text style={[s.previewUiTitle, { color: theme.textMuted }]}>Buttons</Text>
              <View style={s.previewUiRow}>
                <View style={[s.previewBtnPrimary, { backgroundColor: theme.accent }]}>
                  <Text style={s.previewBtnTextPrimary}>Primary Button</Text>
                </View>
                <View style={[s.previewBtnOutline, { borderColor: theme.accent }]}>
                  <Text style={[s.previewBtnTextOutline, { color: theme.accent }]}>Outline</Text>
                </View>
                <View style={s.previewBtnGhost}>
                  <Text style={[s.previewBtnTextGhost, { color: theme.accent }]}>Ghost</Text>
                </View>
              </View>

              {/* Badges Row */}
              <Text style={[s.previewUiTitle, { color: theme.textMuted, marginTop: 4 }]}>Badges & Tags</Text>
              <View style={s.previewUiRow}>
                <View style={[s.previewBadge, { backgroundColor: theme.accentBg, borderColor: theme.accentBorder }]}>
                  <Text style={[s.previewBadgeText, { color: theme.accent }]}>Featured</Text>
                </View>
                <View style={[s.previewBadge, { backgroundColor: theme.success + '1a', borderColor: theme.success + '40' }]}>
                  <Text style={[s.previewBadgeText, { color: theme.success }]}>Online</Text>
                </View>
                <View style={[s.previewBadge, { backgroundColor: theme.danger + '1a', borderColor: theme.danger + '40' }]}>
                  <Text style={[s.previewBadgeText, { color: theme.danger }]}>Alert</Text>
                </View>
              </View>

              {/* Progress & Loaders */}
              <View style={s.previewUiProgressSection}>
                <View style={s.previewUiProgressLabelRow}>
                  <Text style={[s.previewUiProgressLabel, { color: theme.text }]}>Dynamic Progress Fill</Text>
                  <Text style={[s.previewUiProgressLabel, { color: theme.accent }]}>75%</Text>
                </View>
                <View style={[s.previewUiProgressBarTrack, { backgroundColor: theme.card2 }]}>
                  <View style={[s.previewUiProgressBarFill, { backgroundColor: theme.accent, width: '75%' }]} />
                </View>
              </View>
            </View>
          )}
        </View>

        <Text style={[s.note, { color: theme.textFaint }]}>
          Choose between Light, Dark, or Darker (AMOLED) modes and configure your favorite color accent. Theme and accents apply instantly across all screens.
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5,
  },
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontFamily: typography.fontSemiBold },
  sectionLabel: { fontSize: 12, fontFamily: typography.fontMedium, textTransform: 'uppercase', letterSpacing: 0.8 },
  selectorContainer: {
    flexDirection: 'row',
    borderRadius: 24,
    padding: 4,
    borderWidth: 1,
    gap: 4,
  },
  selectorTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectorIcon: {
    fontSize: 16,
  },
  selectorText: {
    fontSize: 14,
    fontFamily: typography.fontSemiBold,
  },
  descriptionText: {
    fontSize: 13,
    fontFamily: typography.fontRegular,
    textAlign: 'center',
    marginTop: -4,
  },
  accentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  accentCard: {
    width: '48%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
  },
  accentCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accentColorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accentTitle: {
    fontSize: 12,
    fontFamily: typography.fontSemiBold,
  },
  accentDesc: {
    fontSize: 9,
    fontFamily: typography.fontRegular,
    marginTop: 1,
    lineHeight: 12,
  },
  note: {
    fontSize: 12, fontFamily: typography.fontRegular, lineHeight: 18,
    marginTop: 4,
  },
  previewWidget: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
    overflow: 'hidden',
  },
  previewTabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    paddingBottom: 4,
    gap: 16,
  },
  previewTabBtn: {
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderColor: 'transparent',
  },
  previewTabBtnText: {
    fontSize: 11,
    fontFamily: typography.fontSemiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
    paddingBottom: 8,
  },
  previewUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewAvatarText: {
    fontSize: 10,
    fontWeight: '700',
  },
  previewUsername: {
    fontSize: 11,
    fontFamily: typography.fontSemiBold,
  },
  previewUserStatus: {
    fontSize: 8,
    fontWeight: '600',
  },
  previewChatBody: {
    gap: 8,
    paddingVertical: 4,
  },
  previewBubbleFriend: {
    alignSelf: 'flex-start',
    maxWidth: '85%',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderTopLeftRadius: 2,
  },
  previewBubbleSelf: {
    alignSelf: 'flex-end',
    maxWidth: '85%',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderTopRightRadius: 2,
  },
  previewBubbleText: {
    fontSize: 11,
    lineHeight: 15,
  },
  previewBubbleTime: {
    fontSize: 8,
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  previewInputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 0.5,
    paddingTop: 8,
  },
  previewInput: {
    flex: 1,
    height: 24,
    borderRadius: 12,
    borderWidth: 0.5,
    paddingLeft: 10,
    justifyContent: 'center',
  },
  previewSendBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewUiContainer: {
    paddingVertical: 4,
    gap: 10,
  },
  previewUiTitle: {
    fontSize: 10,
    fontFamily: typography.fontMedium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewUiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  previewBtnPrimary: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBtnTextPrimary: {
    color: '#fff',
    fontSize: 10,
    fontFamily: typography.fontSemiBold,
  },
  previewBtnOutline: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBtnTextOutline: {
    fontSize: 10,
    fontFamily: typography.fontSemiBold,
  },
  previewBtnGhost: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBtnTextGhost: {
    fontSize: 10,
    fontFamily: typography.fontSemiBold,
  },
  previewBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'transparent',
  },
  previewBadgeText: {
    fontSize: 9,
    fontFamily: typography.fontMedium,
  },
  previewUiProgressSection: {
    gap: 6,
    marginTop: 6,
  },
  previewUiProgressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewUiProgressLabel: {
    fontSize: 10,
    fontFamily: typography.fontSemiBold,
  },
  previewUiProgressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  previewUiProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
})
