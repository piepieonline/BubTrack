import { useState } from 'preact/hooks'
import type { RowStore } from '../rowStore'
import { addTodo, deleteTodo, setTodoDone, type Todo } from '../todos'
import type { Perform } from '../useRows'

type Props = {
  store: RowStore
  todos: Todo[]
  busy: boolean
  perform: Perform<Todo>
}

export function TodosPage({ store, todos, busy, perform }: Props) {
  const [task, setTask] = useState('')

  async function submitAdd(e: Event) {
    e.preventDefault()
    if (!task.trim()) return
    if (await perform(() => addTodo(store, task))) setTask('')
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
            <button
              class="link danger-link"
              disabled={busy}
              aria-label={`Delete ${todo.task}`}
              onClick={() => perform((fresh) => deleteTodo(store, fresh, todo))}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
