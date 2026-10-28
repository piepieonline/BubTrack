import { COLUMNS } from './entries'
import { FIRST_DATA_ROW, type CellUpdate, type RowStore, type StoredRow } from './rowStore'
import { appendRows, batchUpdate, readRange } from './sheets'

const columnLetter = (column: number) => String.fromCharCode('A'.charCodeAt(0) + column)
const LAST_COLUMN = columnLetter(COLUMNS.length - 1)
const ALL_ROWS_RANGE = `A1:${LAST_COLUMN}`
const HEADER_RANGE = `A1:${LAST_COLUMN}1`

export class SheetRowStore implements RowStore {
  private readonly spreadsheetId: string

  constructor(spreadsheetId: string) {
    this.spreadsheetId = spreadsheetId
  }

  async readAll(): Promise<StoredRow[]> {
    const [header, ...rows] = await readRange(this.spreadsheetId, ALL_ROWS_RANGE)
    if (!header?.length) {
      await batchUpdate(this.spreadsheetId, [{ range: HEADER_RANGE, values: [[...COLUMNS]] }])
    }
    return rows.map((cells, index) => ({ rowNumber: index + FIRST_DATA_ROW, cells }))
  }

  async append(rows: string[][]) {
    await appendRows(this.spreadsheetId, ALL_ROWS_RANGE, rows)
  }

  async update(cells: CellUpdate[]) {
    await batchUpdate(
      this.spreadsheetId,
      cells.map(({ rowNumber, column, value }) => ({
        range: `${columnLetter(column)}${rowNumber}`,
        values: [[value]],
      })),
    )
  }
}
