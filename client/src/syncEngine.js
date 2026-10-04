import { applyPulledTask, getMeta, getOutbox, getTask, removeOutbox, setMeta, setSyncState } from './db.js'

let forcedOffline = false
let online = navigator.onLine
let running = null
let retry = 1000
let timer
const listeners = new Set()
const log = []
const emit = item => { log.unshift({ ...item, time: new Date().toISOString() }); log.splice(100); listeners.forEach(fn => fn(log)) }
const publish = () => listeners.forEach(fn => fn(log))
export const getSyncLog = () => log
export const subscribeSyncLog = fn => { listeners.add(fn); fn(log); return () => listeners.delete(fn) }
export const isOnline = () => online && !forcedOffline
export const isSimulatedOffline = () => forcedOffline

async function checkHealth() {
  if (!navigator.onLine || forcedOffline) return setOnline(false)
  try { const response = await fetch('/health'); setOnline(response.ok) } catch { setOnline(false) }
}

function setOnline(value) {
  online = value
  publish()
  if (isOnline()) syncNow()
}

export function setSimulatedOffline(value) {
  forcedOffline = value
  publish()
  if (!value) checkHealth()
}

export function syncNow() {
  if (!isOnline()) return Promise.resolve()
  if (running) return running
  running = sync().finally(() => { running = null })
  return running
}

async function sync() {
  try {
    const deviceId = await getMeta('deviceId') || crypto.randomUUID()
    await setMeta('deviceId', deviceId)
    for (const item of await getOutbox()) {
      const response = await fetch('/sync/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deviceId, ops: [{ opId: item.opId, entityId: item.entityId, type: item.type, baseVersion: item.baseVersion, changes: item.changes }] }) })
      if (!response.ok) throw Error('Push failed')
      const { results } = await response.json()
      const result = results[0]
      if (result.status === 'applied' || result.status === 'duplicate') {
        if (result.record) await applyPulledTask(result.record)
        await removeOutbox(item.opId)
        emit({ type: result.status, taskId: item.entityId })
      } else if (result.status === 'conflict') {
        const local = await getTask(item.entityId)
        await (await import('./db.js')).db.tasks.put({ ...local, version: result.record.version, syncState: 'conflict', conflict: { base: result.base, server: result.record } })
        await removeOutbox(item.opId)
        emit({ type: 'conflict', taskId: item.entityId })
      } else {
        await setSyncState(item.entityId, 'failed')
        emit({ type: 'error', taskId: item.entityId })
      }
    }
    const cursor = await getMeta('cursor') || ''
    const response = await fetch(`/sync/pull?since=${encodeURIComponent(cursor)}`)
    if (!response.ok) throw Error('Pull failed')
    const data = await response.json()
    for (const record of data.records) { await applyPulledTask(record); emit({ type: 'pulled', taskId: record.id }) }
    if (data.cursor != null) await setMeta('cursor', data.cursor)
    retry = 1000
    emit({ type: 'complete' })
  } catch (error) {
    online = false
    emit({ type: 'offline', message: error.message })
    clearTimeout(timer)
    timer = setTimeout(() => { checkHealth().then(() => isOnline() && syncNow()) }, retry)
    retry = Math.min(retry * 2, 60000)
    publish()
  }
}

window.addEventListener('online', () => checkHealth())
window.addEventListener('offline', () => setOnline(false))
checkHealth()
