import { useCallback, useEffect, useState } from 'react'
import { toAppError } from '../errors'

export const useAsyncResource = <T>(loader: () => Promise<T>) => {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const reload = useCallback(async () => { setLoading(true); setError(null); try { setData(await loader()) } catch (cause) { setError(toAppError(cause).message) } finally { setLoading(false) } }, [loader])
  useEffect(() => { const timer = window.setTimeout(() => { void reload() }, 0); return () => window.clearTimeout(timer) }, [reload])
  return { data, loading, error, reload }
}
