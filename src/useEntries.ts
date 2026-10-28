import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import { parseEntries, type Entry } from './entries'
import type { RowStore } from './rowStore'

export type Perform = (action?: (fresh: Entry[]) => Promise<void>) => Promise<boolean>

const BACKGROUND_REFRESH_MS = 60_000

export function useEntries(store: RowStore, canRefresh: () => boolean) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const latestLoad = useRef(0)
  const performing = useRef(false)

  // Only the most recent read updates state, so a slow background read can't overwrite a newer one.
  const load = useCallback(async () => {
    const loadNumber = ++latestLoad.current
    const fresh = parseEntries(await store.readAll())
    if (loadNumber === latestLoad.current) setEntries(fresh)
    return fresh
  }, [store])

  // Always re-reads first so actions see the other phone's latest writes.
  const perform: Perform = useCallback(async (action) => {
    performing.current = true
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
      performing.current = false
      setBusy(false)
    }
  }, [load])

  useEffect(() => {
    perform()
  }, [perform])

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible' && !performing.current && canRefresh()) {
        load().catch(() => {})
      }
    }, BACKGROUND_REFRESH_MS)
    return () => clearInterval(id)
  }, [load, canRefresh])

  return { entries, busy, error, perform, dismissError: () => setError(undefined) }
}
