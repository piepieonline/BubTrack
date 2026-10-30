import { useState } from 'preact/hooks'
import type { RowStore } from '../rowStore'
import { addTodo, deleteTodo, renameTodo, setTodoDone, type Todo } from '../todos'
import type { Perform } from '../useRows'

type Props = {
  store: RowStore
  todos: Todo[]
  busy: boolean
  perform: Perform<Todo>
}

export function TodosPage({ store, todos, busy, perform }: Props) {
  const [task, setTask] = useState('')
  const [editing, setEditing] = useState<Todo>()
  const [editedTask, setEditedTask] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState<Todo>()

  async function submitAdd(e: Event) {
    e.preventDefault()
    if (!task.trim()) return
    if (await perform(() => addTodo(store, task))) setTask('')
  }

  function openEdit(todo: Todo) {
    setEditedTask(todo.task)
    setEditing(todo)
  }

  async function submitEdit(e: Event) {
    e.preventDefault()
    if (!editedTask.trim()) return
    if (await perform((fresh) => renameTodo(store, fresh, editing!, editedTask))) setEditing(undefined)
  }

  async function remove(todo: Todo) {
    if (await perform((fresh) => deleteTodo(store, fresh, todo))) setConfirmingDelete(undefined)
  }

  return (
    <section class="todos-page">
      <form class="todo-add" onSubmit={submitAdd}>
        <input placeholder="New task" value={task} onInput={(e) => setTask(e.currentTarget.value)} />
        <button disabled={busy || !task.trim()}>Add</button>
      </form>
      {todos.length === 0 && <p class="muted">Nothing to do</p>}
      <ul class="todo-list">
        {todos.map((todo) => (
          <li key={todo.rowNumber} class={todo.doneAt ? 'todo done' : 'todo'}>
            <label>
              <input
                type="checkbox"
                checked={!!todo.doneAt}
                disabled={busy}
                onChange={() => perform((fresh) => setTodoDone(store, fresh, todo, !todo.doneAt))}
              />
              <span>{todo.task}</span>
            </label>
            <button class="link icon-link" disabled={busy} aria-label={`Edit ${todo.task}`} onClick={() => openEdit(todo)}>
              ✎
            </button>
            <button
              class="link icon-link"
              disabled={busy}
              aria-label={`Delete ${todo.task}`}
              onClick={() => (todo.doneAt ? remove(todo) : setConfirmingDelete(todo))}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      {editing && (
        <div class="overlay" onClick={(e) => e.target === e.currentTarget && setEditing(undefined)}>
          <form class="dialog" aria-label="Edit task" onSubmit={submitEdit}>
            <h2>Edit task</h2>
            <input value={editedTask} onInput={(e) => setEditedTask(e.currentTarget.value)} autoFocus />
            <div class="dialog-actions">
              <button type="button" class="secondary" onClick={() => setEditing(undefined)}>Cancel</button>
              <button disabled={busy || !editedTask.trim()}>Save</button>
            </div>
          </form>
        </div>
      )}
      {confirmingDelete && (
        <div class="overlay" onClick={(e) => e.target === e.currentTarget && setConfirmingDelete(undefined)}>
          <div class="dialog" role="dialog" aria-label="Delete task">
            <h2>Delete "{confirmingDelete.task}"?</h2>
            <p class="muted">It isn't done yet.</p>
            <div class="dialog-actions">
              <button class="secondary" onClick={() => setConfirmingDelete(undefined)}>Cancel</button>
              <button class="secondary danger" disabled={busy} onClick={() => remove(confirmingDelete)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
