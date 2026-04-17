import { useEffect, useState } from 'react'
import { Stack, router, useSegments } from 'expo-router'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import {
  registerForPushNotifications,
  savePushToken,
} from '../lib/notifications'

export default function RootLayout() {
  const { session, setSession } = useAuthStore()
  const segments = useSegments()
  const [mounted, setMounted] = useState(false)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    setMounted(true)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setInitialized(true)
      if (session) {
        registerForPushNotifications().then(token => {
          if (token) savePushToken(token)
        })
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        if (session) {
          registerForPushNotifications().then(token => {
            if (token) savePushToken(token)
          })
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!mounted || !initialized) return
    const inAuth = segments[0] === '(auth)'
    if (!session && !inAuth) {
      router.replace('/(auth)/welcome')
    }
  }, [session, segments, mounted, initialized])

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="map" />
      <Stack.Screen name="academic" />
      <Stack.Screen name="clubs" />
      <Stack.Screen name="confessions" />
      <Stack.Screen name="deals" />
      <Stack.Screen name="profile" />
    </Stack>
  )
}