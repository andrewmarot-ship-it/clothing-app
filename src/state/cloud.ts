/**
 * Supabase: sign-in and the cloud copy of the wardrobe. Everything here is
 * optional: without VITE_SUPABASE_URL the app runs on this device only.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { photoPath, type ItemRow, type ProfileData, type ProfileRow, type StoredItem } from '../domain/sync'
import { getPhoto } from './photos'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const supabase: SupabaseClient | null = url && key
  ? createClient(url, key, {
      auth: {
        persistSession: true,
        detectSessionInUrl: true,
        // Magic links often open in a different browser from the one that asked
        // (the mail app's). The implicit flow works there; PKCE wouldn't.
        flowType: 'implicit',
      },
    })
  : null

export const cloudEnabled = supabase !== null

const BUCKET = 'photos'

function client(): SupabaseClient {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

/** Email a sign-in link that brings the user back to this page. */
export async function sendSignInLink(email: string): Promise<void> {
  const { error } = await client().auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } })
  if (error) throw error
}

export async function signOut(): Promise<void> {
  await client().auth.signOut()
}

/** The current access token, for calling our own API. */
export async function accessToken(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

export async function pullAll(): Promise<{ items: ItemRow[]; profile: ProfileRow | null }> {
  const db = client()
  const [items, profile] = await Promise.all([
    db.from('items').select('id, data, client_updated_at, deleted'),
    db.from('profiles').select('data, client_updated_at').maybeSingle(),
  ])
  if (items.error) throw items.error
  if (profile.error) throw profile.error
  return { items: (items.data ?? []) as ItemRow[], profile: (profile.data as ProfileRow | null) ?? null }
}

/** Remove a piece's stored images, except the ones still in use. */
async function removeStalePhotos(userId: string, itemId: string, keep: string[]) {
  const storage = client().storage.from(BUCKET)
  const { data } = await storage.list(userId, { search: `${itemId}-` })
  const stale = (data ?? []).map((f) => f.name).filter((name) => name.startsWith(`${itemId}-`) && !keep.includes(name))
  if (stale.length) await storage.remove(stale.map((name) => photoPath(userId, name)))
}

/**
 * Upload any images not yet in the cloud, then save the pieces. `uploaded`
 * is this device's record of which image keys are already uploaded.
 */
export async function pushItems(userId: string, items: StoredItem[], uploaded: Set<string>): Promise<void> {
  if (!items.length) return
  const db = client()
  for (const it of items) {
    const keys = [it.photoId, it.originalId].filter((k): k is string => !!k)
    for (const k of keys) {
      if (uploaded.has(k)) continue
      const blob = await getPhoto(k)
      if (!blob) continue
      const { error } = await db.storage.from(BUCKET).upload(photoPath(userId, k), blob, { upsert: true, contentType: blob.type || 'image/webp' })
      if (error) throw error
      uploaded.add(k)
    }
    // A retake leaves the previous images behind; tidy them up.
    if (keys.length) await removeStalePhotos(userId, it.id, keys).catch(() => {})
  }
  const { error } = await db.from('items').upsert(
    items.map((it) => ({
      user_id: userId,
      id: it.id,
      data: it,
      photo_path: it.photoId ? photoPath(userId, it.photoId) : null,
      original_path: it.originalId ? photoPath(userId, it.originalId) : null,
      client_updated_at: it.updatedAt ?? Date.now(),
      deleted: false,
    })),
  )
  if (error) throw error
}

export async function pushDeletes(userId: string, deleted: Record<string, number>): Promise<void> {
  const ids = Object.keys(deleted)
  if (!ids.length) return
  const { error } = await client()
    .from('items')
    .upsert(ids.map((id) => ({ user_id: userId, id, data: {}, photo_path: null, original_path: null, client_updated_at: deleted[id], deleted: true })))
  if (error) throw error
  await Promise.all(ids.map((id) => removeStalePhotos(userId, id, []).catch(() => {})))
}

export async function pushProfile(userId: string, data: ProfileData, updatedAt: number): Promise<void> {
  const { error } = await client().from('profiles').upsert({ user_id: userId, data, client_updated_at: updatedAt })
  if (error) throw error
}

export async function downloadPhoto(userId: string, key: string): Promise<Blob | null> {
  const { data, error } = await client().storage.from(BUCKET).download(photoPath(userId, key))
  return error ? null : data
}
