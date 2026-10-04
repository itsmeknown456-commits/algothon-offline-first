import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db.js'
import ConnectivityBar from './components/ConnectivityBar.jsx'
import ConflictResolver from './components/ConflictResolver.jsx'
import SyncTimeline from './components/SyncTimeline.jsx'
import TaskForm from './components/TaskForm.jsx'
import TaskList from './components/TaskList.jsx'

export default function App() {
  const conflicts = useLiveQuery(() => db.tasks.where('syncState').equals('conflict').toArray(), []) || []
  return <main className="app"><header><p className="eyebrow">OFFLINE-FIRST TASK TRACKER</p><h1>FieldSync</h1><p>Keep work moving, online or off.</p></header><ConnectivityBar /><div className="workspace"><div><TaskForm /><TaskList />{conflicts.map(task => <ConflictResolver key={task.id} task={task} />)}</div><SyncTimeline /></div></main>
}
