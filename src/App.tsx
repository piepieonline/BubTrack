import type { ComponentChildren } from 'preact'
import { useEffect, useMemo, useState } from 'preact/hooks'
import { hasValidToken, onSignedOut, signOut, startSignIn, takeSignInError } from './auth'
import { HeaderMenu } from './components/HeaderMenu'
import { COLUMNS, parseEntries, type Entry } from './entries'
import { ActionsPage } from './pages/ActionsPage'
import { LogPage } from './pages/LogPage'
import { TimersPage } from './pages/TimersPage'
import { TodosPage } from './pages/TodosPage'
import { forgetSavedSheet, loadSavedSheet, pickSpreadsheet, type PickedSheet } from './picker'
import type { RowStore } from './rowStore'
import { SessionRowStore } from './sessionRowStore'
import { SheetRowStore } from './sheetRowStore'
import { parseTimers, TIMER_COLUMNS, TIMERS_SHEET, type Timer } from './timers'
import { parseTodos, TODO_COLUMNS, TODOS_SHEET, type Todo } from './todos'
import { useRows, type Perform } from './useRows'

const alwaysRefresh = () => true
const isTestMode = new URLSearchParams(location.search).has('test')

export function App() {
  return isTestMode ? <TestModeApp /> : <GoogleApp />
}

function TestModeApp() {
  const store = useMemo(() => new SessionRowStore('bubtrack.test.rows'), [])
  const timersStore = useMemo(() => new SessionRowStore('bubtrack.test.timers'), [])
  const todosStore = useMemo(() => new SessionRowStore('bubtrack.test.todos'), [])
  return (
    <Main
      store={store}
      timersStore={timersStore}
      todosStore={todosStore}
      canRefresh={alwaysRefresh}
      header={(perform, performTimers, performTodos) => (
        <div class="test-banner">
          <strong>TEST MODE</strong>
          <HeaderMenu>
            <button
              class="menu-item"
              onClick={() => {
                perform(async () => store.clear())
                performTimers(async () => timersStore.clear())
                performTodos(async () => todosStore.clear())
              }}
            >
              Clear data
            </button>
          </HeaderMenu>
        </div>
      )}
    />
  )
}

function GoogleApp() {
  const [signedIn, setSignedIn] = useState(hasValidToken())
  const [sheet, setSheet] = useState<PickedSheet | undefined>(loadSavedSheet())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>(takeSignInError)
  const store = useMemo(() => sheet && new SheetRowStore(sheet.id, COLUMNS), [sheet?.id])
  const timersStore = useMemo(() => sheet && new SheetRowStore(sheet.id, TIMER_COLUMNS, TIMERS_SHEET), [sheet?.id])
  const todosStore = useMemo(() => sheet && new SheetRowStore(sheet.id, TODO_COLUMNS, TODOS_SHEET), [sheet?.id])

  useEffect(() => onSignedOut(() => setSignedIn(false)), [])

  // Back to the sign-in button rather than redirecting away mid-action.
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

  if (!signedIn || !store || !timersStore || !todosStore) {
    return (
      <Gate error={error}>
        {!signedIn
          ? <button disabled={busy} onClick={startSignIn}>Sign in with Google</button>
          : <button disabled={busy} onClick={chooseSheet}>Choose spreadsheet</button>}
      </Gate>
    )
  }

  return (
    <Main
      store={store}
      timersStore={timersStore}
      todosStore={todosStore}
      canRefresh={hasValidToken}
      header={() => (
        <div class="sheet-bar">
          <span class="muted">{sheet!.name}</span>
          <HeaderMenu>
            <button class="menu-item" onClick={chooseSheet}>Change spreadsheet</button>
            <button class="menu-item" onClick={handleSignOut}>Sign out</button>
          </HeaderMenu>
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

type Route = 'actions' | 'log' | 'timers' | 'todos'

function useHashRoute(): Route {
  const [hash, setHash] = useState(location.hash)
  useEffect(() => {
    const onHashChange = () => setHash(location.hash)
    addEventListener('hashchange', onHashChange)
    return () => removeEventListener('hashchange', onHashChange)
  }, [])
  if (hash === '#/log') return 'log'
  if (hash === '#/timers') return 'timers'
  if (hash === '#/todos') return 'todos'
  return 'actions'
}

type MainProps = {
  store: RowStore
  timersStore: RowStore
  todosStore: RowStore
  canRefresh: () => boolean
  header: (perform: Perform<Entry>, performTimers: Perform<Timer>, performTodos: Perform<Todo>) => ComponentChildren
}

function Main({ store, timersStore, todosStore, canRefresh, header }: MainProps) {
  const { items: entries, busy, error, perform, dismissError } = useRows(store, parseEntries, canRefresh)
  const timers = useRows(timersStore, parseTimers, canRefresh)
  const todos = useRows(todosStore, parseTodos, canRefresh)
  const route = useHashRoute()

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && canRefresh()) {
        perform()
        timers.perform()
        todos.perform()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [perform, timers.perform, todos.perform, canRefresh])

  const pageProps = { store, entries, busy, perform }
  const shownError = error ?? timers.error ?? todos.error

  return (
    <>
      <main>
        {header(perform, timers.perform, todos.perform)}
        {shownError && (
          <p
            class="error"
            onClick={() => {
              dismissError()
              timers.dismissError()
              todos.dismissError()
            }}
          >
            {shownError}
          </p>
        )}
        {route === 'log' && <LogPage {...pageProps} />}
        {route === 'timers' && (
          <TimersPage store={timersStore} timers={timers.items} busy={timers.busy} perform={timers.perform} />
        )}
        {route === 'todos' && (
          <TodosPage store={todosStore} todos={todos.items} busy={todos.busy} perform={todos.perform} />
        )}
        {route === 'actions' && <ActionsPage {...pageProps} />}
      </main>
      <nav class="tabs">
        <a href="#/actions" class={route === 'actions' ? 'active' : ''}>Actions</a>
        <a href="#/log" class={route === 'log' ? 'active' : ''}>Log</a>
        <a href="#/timers" class={route === 'timers' ? 'active' : ''}>Timers</a>
        <a href="#/todos" class={route === 'todos' ? 'active' : ''}>TODO</a>
      </nav>
    </>
  )
}
