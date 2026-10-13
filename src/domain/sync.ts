/**
 * Merging a device's wardrobe with the copy in the cloud. Pure functions so
 * the rules are testable: each piece syncs on its own (newest change wins),
 * deletions travel as tombstones, and the rest of the profile is one record
 * where the newest change wins.
 */
import type { Item, SavedLook } from './types.ts'

/** The synced fields of a piece: everything except runtime-only display state. */
export type StoredItem = Omit<Item, 'photo'>

export interface ItemRow {
  id: string
  data: StoredItem
  client_updated_at: number
  deleted: boolean
}

export interface ProfileData {
  tone: number | null
  myColours: string[]
  saved: SavedLook[]
  wearLog: { date: string; topId: string; botId: string }[]
  topId: string | null
  botId: string | null
}

export interface ProfileRow {
  data: Partial<ProfileData>
  client_updated_at: number
}

export interface ItemMerge {
  /** The merged wardrobe. */
  items: Item[]
  /** Local tombstones still to tell the cloud about. */
  deleted: Record<string, number>
  /** Pieces whose local copy is newer: push these. */
  push: StoredItem[]
  /** Ids deleted here that the cloud still has: push deletions. */
  pushDeletes: string[]
}

export const toStored = ({ photo: _photo, ...rest }: Item): StoredItem => rest

const stamp = (it: { updatedAt?: number }) => it.updatedAt ?? 0

export function mergeItems(local: Item[], localDeleted: Record<string, number>, remote: ItemRow[]): ItemMerge {
  const byId = new Map(local.map((i) => [i.id, i]))
  const remoteById = new Map(remote.map((r) => [r.id, r]))
  const ids = new Set([...byId.keys(), ...remoteById.keys(), ...Object.keys(localDeleted)])

  const items: Item[] = []
  const deleted: Record<string, number> = {}
  const push: StoredItem[] = []
  const pushDeletes: string[] = []

  for (const id of ids) {
    const l = byId.get(id)
    const r = remoteById.get(id)
    const t = localDeleted[id]

    // Deleted on this device, and nothing newer in the cloud.
    if (t != null && (!r || t >= r.client_updated_at)) {
      if (r && !r.deleted) {
        pushDeletes.push(id)
        deleted[id] = t
      }
      continue
    }
    // Deleted elsewhere, more recently than any local change.
    if (r?.deleted && (!l || r.client_updated_at >= stamp(l))) continue

    if (l && r && !r.deleted) {
      if (stamp(l) > r.client_updated_at) {
        items.push(l)
        push.push(toStored(l))
      } else {
        // Keep this device's display URL if the photo is the same one.
        items.push({ ...r.data, ...(l.photoId === r.data.photoId && l.photo ? { photo: l.photo } : {}) })
      }
    } else if (l) {
      items.push(l)
      push.push(toStored(l))
    } else if (r && !r.deleted) {
      items.push({ ...r.data })
    }
  }

  // Keep the local order, with pieces new to this device at the end.
  const order = new Map(local.map((i, n) => [i.id, n]))
  items.sort((a, b) => (order.get(a.id) ?? Infinity) - (order.get(b.id) ?? Infinity))
  return { items, deleted, push, pushDeletes }
}

export interface ProfileMerge {
  profile: ProfileData
  updatedAt: number
  /** True when the local profile is newer and should be pushed. */
  push: boolean
}

export function mergeProfile(local: ProfileData, localUpdatedAt: number, remote: ProfileRow | null): ProfileMerge {
  if (!remote || localUpdatedAt > remote.client_updated_at) return { profile: local, updatedAt: localUpdatedAt, push: true }
  return { profile: { ...local, ...remote.data }, updatedAt: remote.client_updated_at, push: false }
}

/** Drop saved looks, wear entries and outfit picks that point at pieces that no longer exist. */
export function pruneProfile(p: ProfileData, items: Item[]): ProfileData {
  const ids = new Set(items.map((i) => i.id))
  const pair = (l: { topId: string; botId: string }) => ids.has(l.topId) && ids.has(l.botId)
  return {
    ...p,
    saved: p.saved.filter(pair),
    wearLog: p.wearLog.filter(pair),
    topId: p.topId && ids.has(p.topId) ? p.topId : null,
    botId: p.botId && ids.has(p.botId) ? p.botId : null,
  }
}

/** Storage path for a stored image: one private folder per user. */
export const photoPath = (userId: string, key: string) => `${userId}/${key}`
