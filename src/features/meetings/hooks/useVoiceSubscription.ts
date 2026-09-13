import { useSyncExternalStore } from 'react'
import type { VoiceService, VoiceSnapshot, VoiceStatus } from '../services'

/**
 * Subscriptions for the live transcript.
 *
 * The workspace hook used to hold the transcript in its own `useState`, which
 * meant every audio result re-rendered the whole live meeting page — minutes
 * editor, resolutions panel, timeline and the one-second clock included. These
 * hooks read straight from the service instead, so a component only re-renders
 * for the slice of voice state it actually uses.
 */

/** Status, error and both text halves. Identity is stable between changes. */
export const useVoiceSnapshot = (service: VoiceService): VoiceSnapshot => useSyncExternalStore(
  (notify) => service.subscribeToChanges(notify),
  () => service.getSnapshot(),
  () => service.getSnapshot(),
)

/** Only the committed text: does not re-render while a phrase is in flight. */
export const useVoiceFinalText = (service: VoiceService): string => useSyncExternalStore(
  (notify) => service.subscribeToChanges(notify),
  () => service.getFinalTranscript(),
  () => service.getFinalTranscript(),
)

/** Only the phrase being recognised right now. */
export const useVoiceInterimText = (service: VoiceService): string => useSyncExternalStore(
  (notify) => service.subscribeToChanges(notify),
  () => service.getInterimTranscript(),
  () => service.getInterimTranscript(),
)

/** Status alone, for controls that must not re-render on every word. */
export const useVoiceStatus = (service: VoiceService): VoiceStatus => useSyncExternalStore(
  (notify) => service.subscribeToChanges(notify),
  () => service.getStatus(),
  () => service.getStatus(),
)
