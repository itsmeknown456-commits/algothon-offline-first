import { useState } from 'react'
import { updateTask } from '../db.js'
import { syncNow } from '../syncEngine.js'

const fields = ['title', 'status', 'priority', 'assignee', 'notes', 'deleted']

export default function ConflictResolver({ task }) {
  const [choices, setChoices] = useState({})
  if (!task?.conflict) return null
  const { base, server } = task.conflict
  async function resolve() {
    const changes = Object.fromEntries(fields.map(field => [field, choices[field] === 'theirs' ? server[field] : task[field]]))
    await updateTask(task.id, changes)
    syncNow()
  }
  return <section className="conflict-resolver"><h3>Resolve conflict: {task.title}</h3>{fields.filter(field => task[field] !== server[field]).map(field => <label key={field}>{field}: mine “{String(task[field])}” / theirs “{String(server[field])}”<select value={choices[field] || 'mine'} onChange={event => setChoices({ ...choices, [field]: event.target.value })}><option value="mine">Keep mine</option><option value="theirs">Use theirs</option></select></label>)}<button onClick={resolve}>Save resolution</button></section>
}
