import { useEffect, useState } from 'react'
import { toAppError } from '../../../errors'
import type { VoiceService } from '../services'

export const useVoiceRecorder = (service: VoiceService) => {
  const [transcript, setTranscript] = useState(service.getTranscript())
  const [recording, setRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const unsubscribe = service.subscribe((value, active) => { setTranscript(value); setRecording(active) })
    /* The service restarts itself on a timer, so an unmount while recording
       has to stop the engine as well as drop the subscription. */
    return () => { unsubscribe(); service.stopRecording() }
  }, [service])
  const start = () => { try { setError(null); service.startRecording() } catch (cause) { setError(toAppError(cause).message) } }
  const stop = () => service.stopRecording()
  const clear = () => service.clearTranscript()
  return { transcript, recording, error, start, stop, clear }
}
