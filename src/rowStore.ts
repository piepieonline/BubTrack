export type Cell = string | number

export type StoredRow = { rowNumber: number; cells: Cell[] }

export type CellUpdate = { rowNumber: number; column: number; value: string }

export interface RowStore {
  readAll(): Promise<StoredRow[]>
  append(rows: string[][]): Promise<void>
  update(cells: CellUpdate[]): Promise<void>
  delete(rowNumber: number): Promise<void>
}

export const FIRST_DATA_ROW = 2
