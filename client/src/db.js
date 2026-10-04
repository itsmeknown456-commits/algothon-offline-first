import Dexie from 'dexie'

export const db = new Dexie('fieldsync')
db.version(1).stores({ tasks: '&id,status,syncState,updatedAt', outbox: '++seq,&opId,entityId', meta: '&key' })

const op = (task, type, changes) => ({ opId: crypto.randomUUID(), entityId: task.id, type, baseVersion: task.version, changes })

export async function addTask(input) {
  const task = { id: crypto.randomUUID(), title: input.title, status: input.status || 'todo', priority: input.priority || 'low', assignee: input.assignee || '', notes: input.notes || '', version: 0, deleted: false, updatedAt: new Date().toISOString(), syncState: 'pending' }
  const { syncState, ...changes } = task
  await db.transaction('rw', db.tasks, db.outbox, async () => { await db.tasks.add(task); await db.outbox.add(op(task, 'create', changes)) })
  return task
}

export async function updateTask(id, changes) {
  let task
  await db.transaction('rw', db.tasks, db.outbox, async () => {
    const old = await db.tasks.get(id)
    if (!old) return
    task = { ...old, ...changes, updatedAt: new Date().toISOString(), syncState: 'pending' }
    delete task.conflict
    await db.tasks.put(task)
    await db.outbox.add(op(old, 'update', changes))
  })
  return task
}

export async function deleteTask(id) {
  await db.transaction('rw', db.tasks, db.outbox, async () => {
    const task = await db.tasks.get(id)
    if (!task) return
    await db.tasks.put({ ...task, deleted: true, updatedAt: new Date().toISOString(), syncState: 'pending' })
    await db.outbox.add(op(task, 'delete', { deleted: true }))
  })
}

export const getOutbox = () => db.outbox.orderBy('seq').toArray()
export const getMeta = async key => (await db.meta.get(key))?.value
export const setMeta = (key, value) => db.meta.put({ key, value })
export const removeOutbox = opId => db.outbox.where('opId').equals(opId).delete()
export const clearOutbox = entityId => db.outbox.where('entityId').equals(entityId).delete()
export async function rebaseOutbox(entityId, version) {
  const items = await db.outbox.where('entityId').equals(entityId).sortBy('seq')
  for (const item of items) { await db.outbox.update(item.seq, { baseVersion: version }); version++ }
}
export const setSyncState = (id, syncState) => db.tasks.update(id, { syncState })
export const getTask = id => db.tasks.get(id)
export const applyPulledTask = task => db.tasks.put({ ...task, syncState: 'synced' })
