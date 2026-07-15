import { Platform } from 'react-native'
import * as FileSystem from 'expo-file-system/legacy'
import { supabase } from './supabase'

/**
 * Upload a local file URI directly to Supabase Storage.
 * Returns the public HTTPS URL on success.
 * @param bucket  - Supabase storage bucket name (e.g. "avatars", "posts-media")
 * @param path    - Object path inside the bucket (e.g. "userId/timestamp.jpg")
 * @param uri     - Local file URI from expo-image-picker or expo-document-picker
 * @param mimeType - MIME type (e.g. "image/jpeg" or "video/mp4")
 * @param upsert  - Set to true to overwrite existing files
 */
export async function uploadFile(
  bucket: string,
  path: string,
  uri: string,
  mimeType: string,
  upsert = false,
): Promise<string> {
  console.log(`[Supabase Storage Upload] Uploading ${uri} to ${bucket}/${path} (${mimeType})`)

  try {
    let fileBody: any;
    if (Platform.OS === 'web') {
      const resBlob = await fetch(uri)
      fileBody = await resBlob.blob()
    } else {
      // Native (Android/iOS) file upload body using FormData
      fileBody = new FormData() as any
      fileBody.append('file', {
        uri,
        name: path.split('/').pop() || 'file',
        type: mimeType,
      })
    }

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, fileBody, { contentType: mimeType, upsert })

    if (uploadError) {
      throw uploadError
    }

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://vcbtvhociaioeyhhsczh.supabase.co'
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`
    
    console.log(`[Supabase Storage Upload] Success. Public URL: ${publicUrl}`)
    return publicUrl
  } catch (err: any) {
    throw new Error(`Upload to Supabase Storage failed: ${err.message || String(err)}`)
  }
}


