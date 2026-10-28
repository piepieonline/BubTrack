import { useCallback, useEffect, useState } from 'preact/hooks'
import { parseEntries, type Entry } from './entries'
import type { RowStore } from './rowStore'

export type Perform = (action?: (fresh: Entry[]) => Promise<void>) => Promise<boolean>

export function useEntries(store: RowStore) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  const load = useCallback(async () => {
    const fresh = parseEntries(await store.readAll())
    setEntries(fresh)
    return fresh
  }, [store])

  // Always re-reads first so actions see the other phone's latest writes.
  const perform: Perform = useCallback(async (action) => {
    setBusy(true)
    setError(undefined)
    try {
      const fresh = await load()
      if (action) {
        await action(fresh)
        await load()
      }
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      return false
    } finally {
      setBusy(false)
    }
  }, [load])

  useEffect(() => {
    perform()
  }, [perform])

  return { entries, busy, error, perform, dismissError: () => setError(undefined) }
}
