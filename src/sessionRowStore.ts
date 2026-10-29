import { FIRST_DATA_ROW, type Cell, type CellUpdate, type RowStore, type StoredRow } from './rowStore'

// Mimics the only USER_ENTERED behaviour the app relies on: a leading apostrophe marks plain text.
const asUserEntered = (value: string) => (value.startsWith("'") ? value.slice(1) : value)

export class SessionRowStore implements RowStore {
  private readonly storageKey: string

  constructor(storageKey: string) {
    this.storageKey = storageKey
  }

  private load(): Cell[][] {
    return JSON.parse(sessionStorage.getItem(this.storageKey) ?? '[]')
  }

  private save(rows: Cell[][]) {
    sessionStorage.setItem(this.storageKey, JSON.stringify(rows))
  }

  async readAll(): Promise<StoredRow[]> {
    return this.load().map((cells, index) => ({ rowNumber: index + FIRST_DATA_ROW, cells }))
  }

  async append(rows: string[][]) {
    this.save([...this.load(), ...rows.map((row) => row.map(asUserEntered))])
  }

  async update(cells: CellUpdate[]) {
    const rows = this.load()
    for (const { rowNumber, column, value } of cells) {
      rows[rowNumber - FIRST_DATA_ROW][column] = asUserEntered(value)
    }
    this.save(rows)
  }

  async delete(rowNumber: number) {
    const rows = this.load()
    rows.splice(rowNumber - FIRST_DATA_ROW, 1)
    this.save(rows)
  }

  clear() {
    sessionStorage.removeItem(this.storageKey)
  }
}
