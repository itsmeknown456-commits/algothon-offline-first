import { applyPulledTask, clearOutbox, db, getMeta, getOutbox, getTask, rebaseOutbox, removeOutbox, setMeta, setSyncState } from './db.js'

let forcedOffline = false
let online = navigator.onLine
let running = null
let healthCheck = null
let retry = 1000
let timer
const requests = new Set()
const listeners = new Set()
const log = []
const publish = () => listeners.forEach(fn => fn([...log]))
const emit = item => { log.unshift({ ...item, time: new Date().toISOString() }); log.splice(100); publish() }
export const getSyncLog = () => [...log]
export const subscribeSyncLog = fn => { listeners.add(fn); fn([...log]); return () => listeners.delete(fn) }
export const isOnline = () => online && !forcedOffline
export const isSimulatedOffline = () => forcedOffline

async function request(url, options) {
  if (!navigator.onLine || forcedOffline) throw Error(forcedOffline ? 'Simulated offline' : 'Offline')
  const controller = new AbortController()
  requests.add(controller)
  try { return await fetch(url, { ...options, signal: controller.signal }) } finally { requests.delete(controller) }
}

function scheduleRetry() {
  if (timer || forcedOffline || !navigator.onLine) return
  timer = setTimeout(async () => {
    timer = null
    await checkHealth()
    if (isOnline()) syncNow()
  }, retry)
  retry = Math.min(retry * 2, 60000)
}

function setOnline(value) {
  const changed = online !== value
  online = value
  publish()
  if (changed) emit({ type: value ? 'online' : 'offline' })
  if (value) { clearTimeout(timer); timer = null; retry = 1000; syncNow() }
}

async function checkHealth() {
  if (!navigator.onLine || forcedOffline) return setOnline(false)
  if (healthCheck) return healthCheck
  healthCheck = (async () => {
    try {
      const response = await request('/health')
      if (!response.ok) throw Error('Health check failed')
      retry = 1000
      setOnline(true)
    } catch {
      setOnline(false)
      scheduleRetry()
    }
  })()
  await healthCheck
  healthCheck = null
}

export function setSimulatedOffline(value) {
  forcedOffline = value
  if (value) { clearTimeout(timer); timer = null; requests.forEach(request => request.abort()); setOnline(false) }
  else checkHealth()
  publish()
}

export function syncNow() {
  if (forcedOffline) return Promise.resolve()
  if (!online) return checkHealth()
  if (running) return running
  running = sync().finally(() => { running = null })
  return running
}

async function sync() {
  try {
    const deviceId = await getMeta('deviceId') || crypto.randomUUID()
    await setMeta('deviceId', deviceId)
    for (const item of await getOutbox()) {
      if (!isOnline()) return
      const response = await request('/sync/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deviceId, ops: [{ opId: item.opId, entityId: item.entityId, type: item.type, baseVersion: item.baseVersion, changes: item.changes }] }) })
      if (!response.ok) throw Error('Push failed')
      const { results } = await response.json()
      const result = results.find(entry => entry.opId === item.opId)
      if (!result) throw Error('Missing push result')
      if (result.status === 'applied' || result.status === 'duplicate') {
        await removeOutbox(item.opId)
        if (result.record) {
          const remaining = (await getOutbox()).some(entry => entry.entityId === item.entityId)
          if (remaining) {
            await rebaseOutbox(item.entityId, result.record.version)
            await db.tasks.update(item.entityId, { version: result.record.version, syncState: 'pending' })
          } else await applyPulledTask(result.record)
        }
        emit({ type: result.status, taskId: item.entityId })
      } else if (result.status === 'conflict') {
        const local = await getTask(item.entityId)
        await db.tasks.put({ ...local, version: result.record.version, syncState: 'conflict', conflict: { base: result.base, server: result.record } })
        await clearOutbox(item.entityId)
        emit({ type: 'conflict', taskId: item.entityId })
      } else {
        await setSyncState(item.entityId, 'failed')
        emit({ type: 'error', taskId: item.entityId })
        break
      }
    }
    if (!isOnline()) return
    const cursor = await getMeta('cursor') || ''
    const response = await request(`/sync/pull?since=${encodeURIComponent(cursor)}`)
    if (!response.ok) throw Error('Pull failed')
    const data = await response.json()
    for (const record of data.records) {
      const local = await getTask(record.id)
      const pending = await db.outbox.where('entityId').equals(record.id).count()
      if (!local || (local.syncState === 'synced' && !pending)) await applyPulledTask(record)
      emit({ type: 'pulled', taskId: record.id })
    }
    if (data.cursor != null) await setMeta('cursor', data.cursor)
    retry = 1000
    emit({ type: 'complete' })
  } catch (error) {
    setOnline(false)
    emit({ type: forcedOffline ? 'simulated-offline' : 'error', message: error.message })
    scheduleRetry()
  }
}

window.addEventListener('online', checkHealth)
window.addEventListener('offline', () => setOnline(false))
checkHealth()

