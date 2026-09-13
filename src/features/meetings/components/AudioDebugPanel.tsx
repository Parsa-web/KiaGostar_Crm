/**
 * AudioDebugPanel — standalone test panel for the recording → IndexedDB → playback chain.
 *
 * This component allows independent testing of each step without going through
 * the full meeting flow. It is intended for debugging and should be removed or
 * hidden in production.
 */

import { useCallback, useRef, useState } from 'react'
import { Button, StatusBadge } from '../../../components/ui'
import { WorkPanel } from '../../../components/work'

const DB_NAME = 'kiagostar.meeting-audio'
const DB_VERSION = 1

type StepStatus = 'pending' | 'running' | 'success' | 'error'

interface StepLog {
  step: string
  status: StepStatus
  detail?: string
}

const TEST_MEETING_ID = '__debug-test__'

export function AudioDebugPanel() {
  const [logs, setLogs] = useState<StepLog[]>([])
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const log = useCallback((step: string, status: StepStatus, detail?: string) => {
    console.log(`[DEBUG] ${step}: ${status}`, detail ?? '')
    setLogs(prev => [...prev, { step, status, detail }])
  }, [])

  const clearLogs = useCallback(() => {
    setLogs([])
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioUrl(null)
  }, [audioUrl])

  const runTest = useCallback(async () => {
    clearLogs()

    // Step 1: Microphone permission
    log('1. getUserMedia', 'running')
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      log('1. getUserMedia', 'success', `${stream.getAudioTracks().length} audio track(s)`)
    } catch (err: unknown) {
      log('1. getUserMedia', 'error', err instanceof Error ? err.message : String(err))
      return
    }

    // Step 2: Create MediaRecorder
    log('2. MediaRecorder', 'running')
    const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
    let mime = ''
    for (const mt of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mt)) { mime = mt; break }
    }
    if (!mime) { log('2. MediaRecorder', 'error', 'No supported MIME type'); return }
    const recorder = new MediaRecorder(stream, { mimeType: mime })
    const chunks: Blob[] = []
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
    log('2. MediaRecorder', 'success', `mime=${mime}`)

    // Step 3: Record for 3 seconds
    log('3. Recording 3s', 'running')
    recorder.start(500)
    await new Promise(r => setTimeout(r, 3000))
    // Stop and wait for onstop
    const blob = await new Promise<Blob | null>((resolve) => {
      recorder.onstop = () => {
        const b = chunks.length > 0 ? new Blob(chunks, { type: mime }) : null
        resolve(b)
      }
      recorder.stop()
      stream.getTracks().forEach(t => t.stop())
    })
    if (!blob || blob.size === 0) {
      log('3. Recording 3s', 'error', `blob is ${blob ? 'empty' : 'null'} (chunks: ${chunks.length})`)
      return
    }
    log('3. Recording 3s', 'success', `size=${blob.size}, type=${blob.type}`)

    // Step 4: Save to IndexedDB
    log('4. IndexedDB save', 'running')
    try {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION)
        req.onupgradeneeded = () => {
          const db = req.result
          if (!db.objectStoreNames.contains('recordings')) {
            db.createObjectStore('recordings', { keyPath: 'id' })
          }
          if (!db.objectStoreNames.contains('segments')) {
            db.createObjectStore('segments', { keyPath: 'id' })
          }
        }
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
      const tx = db.transaction('recordings', 'readwrite')
      tx.objectStore('recordings').put({
        id: `rec-${TEST_MEETING_ID}`,
        meetingId: TEST_MEETING_ID,
        mimeType: blob.type,
        durationMs: 3000,
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
        blob,
      })
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve()
        tx.onabort = () => reject(tx.error)
        tx.onerror = () => reject(tx.error)
      })
      log('4. IndexedDB save', 'success')
    } catch (err: unknown) {
      log('4. IndexedDB save', 'error', err instanceof Error ? err.message : String(err))
      return
    }

    // Step 5: Read from IndexedDB
    log('5. IndexedDB read', 'running')
    try {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION)
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
      const tx = db.transaction('recordings', 'readonly')
      const record = await new Promise<any>((resolve, reject) => {
        const req = tx.objectStore('recordings').get(`rec-${TEST_MEETING_ID}`)
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
      if (!record?.blob) {
        log('5. IndexedDB read', 'error', 'Record not found or blob missing')
        return
      }
      log('5. IndexedDB read', 'success', `size=${record.blob.size}, type=${record.blob.type}`)
    } catch (err: unknown) {
      log('5. IndexedDB read', 'error', err instanceof Error ? err.message : String(err))
      return
    }

    // Step 6: Create Object URL and play
    log('6. Audio playback', 'running')
    const url = URL.createObjectURL(blob)
    setAudioUrl(url)
    log('6. Audio playback', 'success', 'Audio player rendered below')

    // Cleanup test record
    try {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION)
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
      const tx = db.transaction('recordings', 'readwrite')
      tx.objectStore('recordings').delete(`rec-${TEST_MEETING_ID}`)
    } catch { /* cleanup is best-effort */ }
  }, [log, clearLogs])

  return (
    <WorkPanel
      title=" تست ضبط صدا (Debug)"
      icon="report"
      description="این پنل برای تست مستقل زنجیره ضبط → IndexedDB → پخش استفاده می‌شود."
      actions={
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <Button size="sm" variant="success" onClick={runTest}>اجرای تست</Button>
          <Button size="sm" variant="ghost" onClick={clearLogs}>پاک‌کردن</Button>
        </div>
      }
    >
      {logs.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {logs.map((entry, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--font-size-sm)' }}>
              <StatusBadge
                tone={entry.status === 'success' ? 'success' : entry.status === 'error' ? 'danger' : entry.status === 'running' ? 'info' : 'neutral'}
                label={entry.status === 'success' ? '✓' : entry.status === 'error' ? '✗' : entry.status === 'running' ? '...' : '—'}
                size="sm"
              />
              <span><strong>{entry.step}</strong>{entry.detail && <span style={{ color: 'var(--color-text-muted)', marginInlineStart: 'var(--space-1)' }}>{entry.detail}</span>}</span>
            </li>
          ))}
        </ul>
      )}
      {audioUrl && (
        <div style={{ marginBlockStart: 'var(--space-3)' }}>
          <audio ref={audioRef} controls src={audioUrl} style={{ width: '100%' }} />
        </div>
      )}
    </WorkPanel>
  )
}
