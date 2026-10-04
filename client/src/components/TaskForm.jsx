import { useState } from 'react'
import { addTask } from '../db.js'
import { syncNow } from '../syncEngine.js'

export default function TaskForm() {
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState('low')
  const [assignee, setAssignee] = useState('')
  const [notes, setNotes] = useState('')
  async function submit(event) {
    event.preventDefault()
    if (!title.trim()) return
    await addTask({ title: title.trim(), priority, assignee: assignee.trim(), notes: notes.trim() })
    syncNow()
    setTitle(''); setPriority('low'); setAssignee(''); setNotes('')
  }
  return <form className="task-form" onSubmit={submit}><h2>New task</h2><label>Title<input value={title} onChange={event => setTitle(event.target.value)} required /></label><label>Priority<select value={priority} onChange={event => setPriority(event.target.value)}><option value="low">Low</option><option value="med">Medium</option><option value="high">High</option></select></label><label>Assignee<input value={assignee} onChange={event => setAssignee(event.target.value)} /></label><label>Notes<textarea value={notes} onChange={event => setNotes(event.target.value)} /></label><button type="submit">Add task</button></form>
}
