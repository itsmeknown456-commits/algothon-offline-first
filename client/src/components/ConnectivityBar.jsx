import { useEffect, useState } from 'react'
import { isOnline, isSimulatedOffline, setSimulatedOffline, subscribeSyncLog, syncNow } from '../syncEngine.js'

export default function ConnectivityBar() {
  const [online, setOnline] = useState(isOnline())
  const [simulated, setSimulated] = useState(isSimulatedOffline())
  useEffect(() => subscribeSyncLog(() => { setOnline(isOnline()); setSimulated(isSimulatedOffline()) }), [])
  return <section className="connectivity"><span>{online ? 'Online' : 'Offline'}</span><label><input type="checkbox" checked={simulated} onChange={event => setSimulatedOffline(event.target.checked)} /> Simulate offline</label><button onClick={syncNow} disabled={!online}>Sync now</button></section>
}

