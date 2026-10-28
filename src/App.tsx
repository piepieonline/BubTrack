import type { ComponentChildren } from 'preact'
import { useEffect, useMemo, useState } from 'preact/hooks'
import { getAccessToken, hasValidToken, signOut } from './auth'
import { ActionsPage } from './pages/ActionsPage'
import { LogPage } from './pages/LogPage'
import { forgetSavedSheet, loadSavedSheet, pickSpreadsheet, type PickedSheet } from './picker'
import type { RowStore } from './rowStore'
import { SessionRowStore } from './sessionRowStore'
import { SheetRowStore } from './sheetRowStore'
import { useEntries, type Perform } from './useEntries'

const alwaysRefresh = () => true
const isTestMode = new URLSearchParams(location.search).has('test')

export function App() {
  return isTestMode ? <TestModeApp /> : <GoogleApp />
}

function TestModeApp() {
  const store = useMemo(() => new SessionRowStore(), [])
  return (
    <Main
      store={store}
      canRefresh={alwaysRefresh}
      header={(perform) => (
        <div class="test-banner">
          <strong>TEST MODE</strong>
          <button class="link" onClick={() => perform(async () => store.clear())}>Clear data</button>
        </div>
      )}
    />
  )
}

function GoogleApp() {
  const [signedIn, setSignedIn] = useState(hasValidToken())
  const [sheet, setSheet] = useState<PickedSheet | undefined>(loadSavedSheet())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const store = useMemo(() => sheet && new SheetRowStore(sheet.id), [sheet?.id])

  // Popups need a tap, so an expired token sends the user back to the sign-in button.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !hasValidToken()) setSignedIn(false)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(undefined)
    try {
      await action()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const signIn = () => run(async () => {
    await getAccessToken()
    setSignedIn(true)
  })

  const chooseSheet = () => run(async () => {
    const picked = await pickSpreadsheet()
    if (picked) setSheet(picked)
  })

  const handleSignOut = () => run(async () => {
    await signOut()
    forgetSavedSheet()
    setSheet(undefined)
    setSignedIn(false)
  })

  if (!signedIn || !store) {
    return (
      <Gate error={error}>
        {!signedIn
          ? <button disabled={busy} onClick={signIn}>Sign in with Google</button>
          : <button disabled={busy} onClick={chooseSheet}>Choose spreadsheet</button>}
      </Gate>
    )
  }

  return (
    <Main
      store={store}
      canRefresh={hasValidToken}
      header={() => (
        <div class="sheet-bar">
          <span class="muted">{sheet!.name}</span>
          <button class="link" onClick={chooseSheet}>change</button>
          <button class="link" onClick={handleSignOut}>Sign out</button>
        </div>
      )}
    />
  )
}

function Gate({ error, children }: { error?: string; children: ComponentChildren }) {
  return (
    <main class="gate">
      <h1>BubTrack</h1>
      {error && <p class="error">{error}</p>}
      {children}
    </main>
  )
}

type Route = 'actions' | 'log'

function useHashRoute(): Route {
  const [hash, setHash] = useState(location.hash)
  useEffect(() => {
    const onHashChange = () => setHash(location.hash)
    addEventListener('hashchange', onHashChange)
    return () => removeEventListener('hashchange', onHashChange)
  }, [])
  return hash === '#/log' ? 'log' : 'actions'
}

type MainProps = {
  store: RowStore
  canRefresh: () => boolean
  header: (perform: Perform) => ComponentChildren
}

function Main({ store, canRefresh, header }: MainProps) {
  const { entries, busy, error, perform, dismissError } = useEntries(store, canRefresh)
  const route = useHashRoute()

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && canRefresh()) perform()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [perform, canRefresh])

  const pageProps = { store, entries, busy, perform }

  return (
    <>
      <main>
        {header(perform)}
        {error && (
          <p class="error" onClick={dismissError}>{error}</p>
        )}
        {route === 'log' ? <LogPage {...pageProps} /> : <ActionsPage {...pageProps} />}
      </main>
      <nav class="tabs">
        <a href="#/actions" class={route === 'actions' ? 'active' : ''}>Actions</a>
        <a href="#/log" class={route === 'log' ? 'active' : ''}>Log</a>
      </nav>
    </>
  )
}
