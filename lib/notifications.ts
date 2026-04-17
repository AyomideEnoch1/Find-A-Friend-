import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import { supabase } from './supabase'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export async function registerForPushNotifications(): Promise<string | null> {
  try {
    if (!Device.isDevice) return null

    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }

    if (finalStatus !== 'granted') return null

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'FAF Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#a78bfa',
      })
    }

    return null

  } catch (error) {
    console.log('Push notification setup skipped:', error)
    return null
  }
}

export async function savePushToken(token: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase
      .from('profiles')
      .update({ push_token: token } as any)
      .eq('id', user.id)
  } catch (error) {
    console.log('Could not save push token:', error)
  }
}

export async function sendLocalNotification(title: string, body: string) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: null,
    })
  } catch (error) {
    console.log('Could not send notification:', error)
  }
}