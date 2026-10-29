import { FIRST_DATA_ROW, type CellUpdate, type RowStore, type StoredRow } from './rowStore'
import { appendRows, batchUpdate, deleteRow, getSheetId, readRange } from './sheets'

const columnLetter = (column: number) => String.fromCharCode('A'.charCodeAt(0) + column)

export class SheetRowStore implements RowStore {
  private readonly spreadsheetId: string
  private readonly columns: readonly string[]
  private readonly sheetTitle?: string
  private sheetId?: Promise<number>

  // Without a sheet title, ranges target the spreadsheet's first sheet.
  constructor(spreadsheetId: string, columns: readonly string[], sheetTitle?: string) {
    this.spreadsheetId = spreadsheetId
    this.columns = columns
    this.sheetTitle = sheetTitle
  }

  private range(cells: string) {
    return this.sheetTitle ? `'${this.sheetTitle}'!${cells}` : cells
  }

  private get lastColumn() {
    return columnLetter(this.columns.length - 1)
  }

  private resolveSheetId() {
    this.sheetId ??= getSheetId(this.spreadsheetId, this.sheetTitle).catch((e) => {
      this.sheetId = undefined
      throw e
    })
    return this.sheetId
  }

  async readAll(): Promise<StoredRow[]> {
    if (this.sheetTitle) await this.resolveSheetId()
    const [header, ...rows] = await readRange(this.spreadsheetId, this.range(`A1:${this.lastColumn}`))
    if (!header?.length) {
      await batchUpdate(this.spreadsheetId, [{ range: this.range(`A1:${this.lastColumn}1`), values: [[...this.columns]] }])
    }
    return rows.map((cells, index) => ({ rowNumber: index + FIRST_DATA_ROW, cells }))
  }

  async append(rows: string[][]) {
    await appendRows(this.spreadsheetId, this.range(`A1:${this.lastColumn}`), rows)
  }

  async update(cells: CellUpdate[]) {
    await batchUpdate(
      this.spreadsheetId,
      cells.map(({ rowNumber, column, value }) => ({
        range: this.range(`${columnLetter(column)}${rowNumber}`),
        values: [[value]],
      })),
    )
  }

  async delete(rowNumber: number) {
    await deleteRow(this.spreadsheetId, await this.resolveSheetId(), rowNumber)
  }
}
