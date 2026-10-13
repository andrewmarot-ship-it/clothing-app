import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { mergeItems, mergeProfile, pruneProfile, toStored, type ProfileData, type StoredItem } from '../domain/sync'
import type { AppState } from './context'
import { cloudEnabled, downloadPhoto, pullAll, pushDeletes, pushItems, pushProfile, sendSignInLink, signOut as cloudSignOut, supabase } from './cloud'
import { deletePhotos, getPhoto, putPhoto } from './photos'

export type SyncStatus = 'off' | 'signed-out' | 'syncing' | 'synced' | 'offline' | 'error'

export interface CloudUser {
  id: string
  email: string
}

export interface CloudState {
  enabled: boolean
  user: CloudUser | null
  status: SyncStatus
  lastSyncedAt: number | null
  signIn: (email: string) => Promise<void>
  signOut: () => Promise<void>
}

/** What this device has already sent to the cloud, per signed-in user. */
interface SyncMeta {
  items: Record<string, number>
  profile: number
  uploaded: string[]
}

const metaKey = (uid: string) => `clothesline-sync-v1:${uid}`
function loadMeta(uid: string): SyncMeta {
  try {
    const m = JSON.parse(localStorage.getItem(metaKey(uid)) ?? 'null') as SyncMeta | null
    if (m && typeof m.profile === 'number') return { items: m.items ?? {}, profile: m.profile, uploaded: m.uploaded ?? [] }
  } catch {
    // fall through
  }
  return { items: {}, profile: 0, uploaded: [] }
}
function saveMeta(uid: string, m: SyncMeta) {
  try {
    localStorage.setItem(metaKey(uid), JSON.stringify(m))
  } catch {
    // Worst case the next sync re-sends a few pieces.
  }
}

export const profileOf = (s: AppState): ProfileData => ({
  tone: s.tone,
  myColours: s.myColours,
  saved: s.saved,
  wearLog: s.wearLog,
  topId: s.topId,
  botId: s.botId,
})

/** What a full sync decided to send. */
interface Outcome {
  push: StoredItem[]
  pushDeletes: string[]
  deleted: Record<string, number>
  profile: ProfileData
  profileUpdatedAt: number
  pushProfile: boolean
}

const PUSH_DELAY_MS = 1500
const RESYNC_AFTER_MS = 30_000

/**
 * Keeps the wardrobe in step with the user's cloud copy while they're signed
 * in: a full merge on sign-in and when the app comes back into view, and a
 * push of local changes shortly after they happen.
 */
export function useCloudSync(
  state: AppState,
  update: (fn: (s: AppState) => AppState) => void,
  onPhoto: (key: string, blob: Blob) => void,
  reset: () => void,
): CloudState {
  const [user, setUser] = useState<CloudUser | null>(null)
  const [status, setStatus] = useState<SyncStatus>('synced')
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null)
  const latest = useRef(state)
  useLayoutEffect(() => {
    latest.current = state
  }, [state])
  const busy = useRef(false)
  const lastFull = useRef(0)

  // Track the signed-in user.
  useEffect(() => {
    if (!supabase) return
    const toUser = (s: { user: { id: string; email?: string } } | null) => (s ? { id: s.user.id, email: s.user.email ?? '' } : null)
    supabase.auth.getSession().then(({ data }) => setUser(toUser(data.session)))
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(toUser(session)))
    return () => data.subscription.unsubscribe()
  }, [])

  const fail = useCallback((e: unknown) => {
    console.error('sync failed', e)
    setStatus(navigator.onLine ? 'error' : 'offline')
  }, [])

  /** Pull everything, merge, push what's newer here, fetch missing photos. */
  const fullSync = useCallback(
    async (uid: string) => {
      if (busy.current) return
      busy.current = true
      setStatus('syncing')
      try {
        const remote = await pullAll()
        const meta = loadMeta(uid)
        // Merge against the newest local state, so edits made during the pull aren't lost.
        // Merge against the newest local state (edits made during the pull included).
        // Nothing can change between here and the update below: no await in between.
        const s0 = latest.current
        const im = mergeItems(s0.items, s0.deleted, remote.items)
        const pm = mergeProfile(profileOf(s0), s0.profileUpdatedAt, remote.profile)
        const profile = pruneProfile(pm.profile, im.items)
        const o: Outcome = { push: im.push, pushDeletes: im.pushDeletes, deleted: im.deleted, profile, profileUpdatedAt: pm.updatedAt, pushProfile: pm.push }
        update((s) => ({ ...s, items: im.items, deleted: im.deleted, ...profile, profileUpdatedAt: pm.updatedAt }))
        latest.current = { ...s0, items: im.items, deleted: im.deleted, ...profile, profileUpdatedAt: pm.updatedAt }
        const uploaded = new Set(meta.uploaded)
        await pushItems(uid, o.push, uploaded)
        const toDelete = Object.fromEntries(o.pushDeletes.map((id) => [id, o.deleted[id]]))
        await pushDeletes(uid, toDelete)
        if (o.pushProfile) await pushProfile(uid, o.profile, o.profileUpdatedAt)
        if (o.pushDeletes.length) update((s) => ({ ...s, deleted: Object.fromEntries(Object.entries(s.deleted).filter(([id]) => !(id in toDelete))) }))

        // Photos this device doesn't have yet.
        for (const it of latest.current.items) {
          for (const k of [it.photoId, it.originalId]) {
            if (!k || (await getPhoto(k))) continue
            const blob = await downloadPhoto(uid, k)
            if (!blob) continue
            await putPhoto(k, blob)
            uploaded.add(k)
            if (k === it.photoId) onPhoto(k, blob)
          }
        }

        const items = Object.fromEntries(latest.current.items.map((i) => [i.id, i.updatedAt ?? 0]))
        saveMeta(uid, { items, profile: latest.current.profileUpdatedAt, uploaded: [...uploaded] })
        lastFull.current = Date.now()
        setLastSyncedAt(Date.now())
        setStatus('synced')
      } catch (e) {
        fail(e)
      } finally {
        busy.current = false
      }
    },
    [update, onPhoto, fail],
  )

  /** Push local changes made since the last sync. */
  const pushChanges = useCallback(
    async (uid: string) => {
      if (busy.current) return
      const s = latest.current
      const meta = loadMeta(uid)
      const dirty = s.items.filter((i) => (i.updatedAt ?? 0) > (meta.items[i.id] ?? -1))
      const deletes = s.deleted
      const profileDirty = s.profileUpdatedAt > meta.profile
      if (!dirty.length && !Object.keys(deletes).length && !profileDirty) return
      busy.current = true
      setStatus('syncing')
      try {
        const uploaded = new Set(meta.uploaded)
        await pushItems(uid, dirty.map(toStored), uploaded)
        await pushDeletes(uid, deletes)
        if (profileDirty) await pushProfile(uid, profileOf(s), s.profileUpdatedAt)
        if (Object.keys(deletes).length) update((st) => ({ ...st, deleted: Object.fromEntries(Object.entries(st.deleted).filter(([id]) => !(id in deletes))) }))
        for (const i of dirty) meta.items[i.id] = i.updatedAt ?? 0
        for (const id of Object.keys(deletes)) delete meta.items[id]
        saveMeta(uid, { items: meta.items, profile: profileDirty ? s.profileUpdatedAt : meta.profile, uploaded: [...uploaded] })
        setLastSyncedAt(Date.now())
        setStatus('synced')
      } catch (e) {
        fail(e)
      } finally {
        busy.current = false
      }
    },
    [update, fail],
  )

  const uid = user?.id ?? null

  // Full sync on sign-in: a network round trip, which is what effects are for.
  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    if (uid) void fullSync(uid)
  }, [uid, fullSync])

  // Push local edits shortly after they happen.
  const { items, deleted, profileUpdatedAt } = state
  useEffect(() => {
    if (!uid) return
    const t = setTimeout(() => void pushChanges(uid), PUSH_DELAY_MS)
    return () => clearTimeout(t)
  }, [uid, items, deleted, profileUpdatedAt, pushChanges])

  // Catch up with other devices when the app comes back into view or back online.
  useEffect(() => {
    if (!uid) return
    const again = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastFull.current > RESYNC_AFTER_MS) void fullSync(uid)
    }
    document.addEventListener('visibilitychange', again)
    window.addEventListener('online', again)
    return () => {
      document.removeEventListener('visibilitychange', again)
      window.removeEventListener('online', again)
    }
  }, [uid, fullSync])

  const signIn = useCallback((email: string) => sendSignInLink(email), [])

  /** Send anything pending, sign out, and clear this device (the cloud keeps it all). */
  const signOut = useCallback(async () => {
    if (uid) {
      await pushChanges(uid)
      // Never wipe this device while it holds changes the cloud doesn't have.
      const s = latest.current
      const meta = loadMeta(uid)
      const pending = s.items.some((i) => (i.updatedAt ?? 0) > (meta.items[i.id] ?? -1)) || Object.keys(s.deleted).length > 0 || s.profileUpdatedAt > meta.profile
      if (pending) throw new Error('unsynced')
    }
    const keys = latest.current.items.flatMap((i) => [i.photoId, i.originalId]).filter((k): k is string => !!k)
    await cloudSignOut()
    await deletePhotos(keys)
    reset()
  }, [uid, pushChanges, reset])

  return { enabled: cloudEnabled, user, status: !cloudEnabled ? 'off' : uid ? status : 'signed-out', lastSyncedAt, signIn, signOut }
}
