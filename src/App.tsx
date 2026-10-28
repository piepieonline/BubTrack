import { useEffect, useState } from 'preact/hooks'
import { getAccessToken, hasValidToken, signOut } from './auth'
import { DATA_RANGE } from './config'
import { forgetSavedSheet, loadSavedSheet, pickSpreadsheet, type PickedSheet } from './picker'
import { appendRows, readRange, type Row } from './sheets'

export function App() {
  const [signedIn, setSignedIn] = useState(hasValidToken())
  const [sheet, setSheet] = useState<PickedSheet | undefined>(loadSavedSheet())
  const [rows, setRows] = useState<Row[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

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

  const refresh = () => run(async () => setRows(await readRange(sheet!.id, DATA_RANGE)))

  useEffect(() => {
    if (signedIn && sheet) refresh()
  }, [signedIn, sheet?.id])

  const signIn = () => run(async () => {
    await getAccessToken()
    setSignedIn(true)
  })

  const chooseSheet = () => run(async () => {
    const picked = await pickSpreadsheet()
    if (picked) setSheet(picked)
  })

  const addTestRow = () => run(async () => {
    await appendRows(sheet!.id, DATA_RANGE, [[new Date().toISOString(), 'test']])
    setRows(await readRange(sheet!.id, DATA_RANGE))
  })

  const handleSignOut = () => run(async () => {
    await signOut()
    forgetSavedSheet()
    setSheet(undefined)
    setRows([])
    setSignedIn(false)
  })

  return (
    <main>
      <header>
        <h1>BubTrack</h1>
        {signedIn && <button class="link" onClick={handleSignOut}>Sign out</button>}
      </header>

      {error && <p class="error">{error}</p>}

      {!signedIn ? (
        <button onClick={signIn} disabled={busy}>Sign in with Google</button>
      ) : !sheet ? (
        <button onClick={chooseSheet} disabled={busy}>Choose spreadsheet</button>
      ) : (
        <>
          <p class="sheet-name">
            {sheet.name} <button class="link" onClick={chooseSheet}>change</button>
          </p>
          <div class="actions">
            <button onClick={refresh} disabled={busy}>Refresh</button>
            <button onClick={addTestRow} disabled={busy}>Add test row</button>
          </div>
          <table>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </main>
  )
}
