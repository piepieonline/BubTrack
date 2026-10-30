import { formatDateTime, parseDateTime, textCell } from './entries'
import type { RowStore, StoredRow } from './rowStore'

export const TODOS_SHEET = 'TODO'

export const TODO_COLUMNS = ['Task', 'Done at'] as const

const TodoColumn = {
  Task: 0,
  DoneAt: 1,
} as const

export type Todo = {
  rowNumber: number
  task: string
  doneAt?: Date
}

function parseTodo({ rowNumber, cells }: StoredRow): Todo | undefined {
  const task = String(cells[TodoColumn.Task] ?? '').trim()
  if (!task) return undefined
  return { rowNumber, task, doneAt: parseDateTime(cells[TodoColumn.DoneAt]) }
}

// Open tasks in sheet order, then done tasks most recent first.
export function parseTodos(rows: StoredRow[]): Todo[] {
  const todos = rows.map(parseTodo).filter((todo): todo is Todo => !!todo)
  const open = todos.filter((todo) => !todo.doneAt)
  const done = todos.filter((todo) => todo.doneAt).sort((a, b) => b.doneAt!.getTime() - a.doneAt!.getTime())
  return [...open, ...done]
}

// The row must still hold the same task on the fresh read, so hand edits to the sheet can't misdirect a write.
function requireTodo(fresh: Todo[], todo: Todo): Todo {
  const match = fresh.find((candidate) => candidate.rowNumber === todo.rowNumber && candidate.task === todo.task)
  if (!match) throw new Error(`"${todo.task}" has changed, try again`)
  return match
}

export async function addTodo(store: RowStore, task: string) {
  await store.append([[textCell(task.trim()), '']])
}

export async function renameTodo(store: RowStore, fresh: Todo[], todo: Todo, task: string) {
  const { rowNumber } = requireTodo(fresh, todo)
  await store.update([{ rowNumber, column: TodoColumn.Task, value: textCell(task.trim()) }])
}

export async function setTodoDone(store: RowStore, fresh: Todo[], todo: Todo, done: boolean) {
  const { rowNumber } = requireTodo(fresh, todo)
  await store.update([{ rowNumber, column: TodoColumn.DoneAt, value: done ? formatDateTime(new Date()) : '' }])
}

export async function deleteTodo(store: RowStore, fresh: Todo[], todo: Todo) {
  await store.delete(requireTodo(fresh, todo).rowNumber)
}
