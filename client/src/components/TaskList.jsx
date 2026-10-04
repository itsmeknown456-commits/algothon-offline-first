import { useLiveQuery } from 'dexie-react-hooks'
import { db, deleteTask, updateTask } from '../db.js'
import { syncNow } from '../syncEngine.js'
import StatusBadge from './StatusBadge.jsx'

export default function TaskList() {
  const tasks = useLiveQuery(() => db.tasks.orderBy('updatedAt').reverse().toArray(), []) || []
  return <section className="task-list"><h2>Tasks</h2>{tasks.filter(task => !task.deleted).map(task => <article className="task-card" key={task.id}><div><h3>{task.title}</h3><p>{task.priority} priority{task.assignee && ` · ${task.assignee}`}</p>{task.notes && <p>{task.notes}</p>}</div><StatusBadge status={task.status} syncState={task.syncState} /><select aria-label={`Status for ${task.title}`} value={task.status} onChange={async event => { await updateTask(task.id, { status: event.target.value }); syncNow() }}><option value="todo">To do</option><option value="doing">Doing</option><option value="done">Done</option></select><button onClick={async () => { await deleteTask(task.id); syncNow() }}>Delete</button></article>)}</section>
}
