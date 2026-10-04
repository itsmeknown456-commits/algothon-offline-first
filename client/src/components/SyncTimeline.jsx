import { useEffect, useState } from 'react'
import { subscribeSyncLog } from '../syncEngine.js'

export default function SyncTimeline() {
  const [events, setEvents] = useState([])
  useEffect(() => subscribeSyncLog(setEvents), [])
  return <section className="sync-timeline"><h2>Sync activity</h2>{events.length ? <ol>{events.map((event, index) => <li key={`${event.time}-${index}`}><time>{new Date(event.time).toLocaleTimeString()}</time> {event.type}{event.taskId && ` · ${event.taskId.slice(0, 8)}`}{event.message && ` · ${event.message}`}</li>)}</ol> : <p>No sync activity yet.</p>}</section>
}
