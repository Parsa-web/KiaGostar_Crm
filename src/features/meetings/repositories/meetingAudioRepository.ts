/**
 * IndexedDB abstraction for meeting audio storage.
 *
 * This repository decouples the UI from the storage mechanism. In the future,
 * it can be swapped for a backend API + Object Storage without touching the
 * LiveMeetingWorkspacePage or any component code.
 *
 * Responsibilities:
 *  - saveRecording / getRecording / deleteRecording  (blob + metadata)
 *  - saveTopicSegments / getTopicSegments            (time-range metadata)
 */

import type { MeetingRecording, TopicSegment } from '../types'

const DB_NAME = 'kiagostar.meeting-audio'
const DB_VERSION = 1
const RECORDINGS_STORE = 'recordings'
const SEGMENTS_STORE = 'segments'

/* ---------- IndexedDB helpers ---------- */

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(RECORDINGS_STORE)) {
        db.createObjectStore(RECORDINGS_STORE, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(SEGMENTS_STORE)) {
        const store = db.createObjectStore(SEGMENTS_STORE, { keyPath: 'id' })
        store.createIndex('meetingId', 'meetingId', { unique: false })
        store.createIndex('topicId', 'topicId', { unique: false })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/** Wraps an IDBRequest in a Promise. */
function reqToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Wait for an IDBTransaction to finish.
 * In modern browsers tx.done is a Promise; fall back to the
 * IDBRequest-based `complete` event for older engines.
 */
function waitForTx(tx: IDBTransaction): Promise<void> {
  // Modern spec: tx.done is a Promise<void>
  if (tx.done && typeof (tx.done as Promise<void>).then === 'function') {
    return tx.done.catch(() => { /* transaction aborted — caller handles */ })
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onabort = () => reject(tx.error)
    tx.onerror = () => reject(tx.error)
  })
}

/* ---------- Public API ---------- */

/**
 * Saves a master recording (metadata + audio blob) to IndexedDB.
 * If a recording for the same meeting already exists it is replaced.
 * Returns true on success, false on failure.
 */
export async function saveRecording(recording: MeetingRecording): Promise<boolean> {
  try {
    const db = await openDB()
    const tx = db.transaction(RECORDINGS_STORE, 'readwrite')
    tx.objectStore(RECORDINGS_STORE).put(recording)
    await waitForTx(tx)
    return true
  } catch {
    return false
  }
}

/**
 * Retrieves the master recording for a meeting, or null if none exists.
 *
 * Uses the record key (id = `rec-${meetingId}`) for a fast direct lookup
 * instead of scanning with a cursor.
 */
export async function getRecording(meetingId: string): Promise<MeetingRecording | null> {
  try {
    const db = await openDB()
    const tx = db.transaction(RECORDINGS_STORE, 'readonly')
    const store = tx.objectStore(RECORDINGS_STORE)
    // Key is `rec-${meetingId}` — direct get is O(1).
    const record = await reqToPromise(store.get(`rec-${meetingId}`))
    return (record as MeetingRecording | undefined) ?? null
  } catch {
    return null
  }
}

/**
 * Deletes the recording for a meeting.
 */
export async function deleteRecording(meetingId: string): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(RECORDINGS_STORE, 'readwrite')
    tx.objectStore(RECORDINGS_STORE).delete(`rec-${meetingId}`)
    await waitForTx(tx)
  } catch {
    // noop
  }
}

/**
 * Saves topic segments for a meeting (replaces all existing segments).
 */
export async function saveTopicSegments(segments: readonly TopicSegment[]): Promise<void> {
  if (!segments.length) return
  try {
    const db = await openDB()
    const meetingId = segments[0].meetingId
    // Single transaction: delete old + insert new
    const tx = db.transaction(SEGMENTS_STORE, 'readwrite')
    const store = tx.objectStore(SEGMENTS_STORE)
    const index = store.index('meetingId')
    // Collect keys to delete via a cursor
    const keysToDelete = await reqToPromise<string[]>(index.getAllKeys(meetingId))
    for (const key of keysToDelete) {
      store.delete(key)
    }
    // Insert new segments
    for (const segment of segments) {
      store.put(segment)
    }
    await waitForTx(tx)
  } catch {
    // noop
  }
}

/**
 * Retrieves topic segments for a meeting, sorted by start time.
 */
export async function getTopicSegments(meetingId: string): Promise<readonly TopicSegment[]> {
  try {
    const db = await openDB()
    const tx = db.transaction(SEGMENTS_STORE, 'readonly')
    const store = tx.objectStore(SEGMENTS_STORE)
    const index = store.index('meetingId')
    const segments = await reqToPromise<TopicSegment[]>(index.getAll(meetingId))
    return segments.slice().sort((a, b) => a.startMs - b.startMs)
  } catch {
    return []
  }
}
