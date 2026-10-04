const http = require('node:http')
const { URL } = require('node:url')

const tasks = new Map()
const history = new Map()
const feed = []
const opResults = new Map()
let cursor = 0
let forceConflict = process.env.MOCK_FORCE_CONFLICT === '1'

function save(record) {
  const copy = { ...record }
  tasks.set(copy.id, copy)
  const versions = history.get(copy.id) || []
  versions.push(copy)
  history.set(copy.id, versions)
  feed.push({ cursor: ++cursor, record: copy })
  return copy
}

function send(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(body))
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = ''
    request.setEncoding('utf8')
    request.on('data', chunk => { body += chunk })
    request.on('end', () => { try { resolve(JSON.parse(body)) } catch { reject(Error('Invalid JSON')) } })
    request.on('error', reject)
  })
}

function apply(op) {
  const previous = opResults.get(op.opId)
  if (previous) return previous.status === 'conflict' ? previous : { ...previous, status: 'duplicate', record: tasks.get(op.entityId) || previous.record }
  let current = tasks.get(op.entityId)
  if (forceConflict) {
    forceConflict = false
    const base = current || { ...op.changes, id: op.entityId, version: op.baseVersion, deleted: false }
    if (!current && op.type === 'create') history.set(op.entityId, [base])
    const record = save({ ...base, title: `${base.title} (server)`, version: (current?.version || op.baseVersion) + 1, updatedAt: new Date().toISOString() })
    const result = { opId: op.opId, status: 'conflict', record, base }
    opResults.set(op.opId, result)
    return result
  }
  if (current && op.baseVersion !== current.version) {
    const base = history.get(op.entityId)?.find(record => record.version === op.baseVersion) || { ...current, version: op.baseVersion }
    const result = { opId: op.opId, status: 'conflict', record: current, base }
    opResults.set(op.opId, result)
    return result
  }
  if (!current && op.type !== 'create') return { opId: op.opId, status: 'error', record: null }
  if (!current && op.type === 'create') history.set(op.entityId, [{ ...op.changes, id: op.entityId, version: op.baseVersion }])
  const record = save({ ...(current || {}), ...op.changes, id: op.entityId, version: (current?.version || 0) + 1, deleted: op.type === 'delete' ? true : (op.changes.deleted ?? current?.deleted ?? false), updatedAt: new Date().toISOString() })
  const result = { opId: op.opId, status: 'applied', record }
  opResults.set(op.opId, result)
  return result
}

http.createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost:3000')
  if (request.method === 'GET' && url.pathname === '/health') return send(response, 200, { ok: true })
  if (request.method === 'GET' && url.pathname === '/sync/pull') {
    const since = Number(url.searchParams.get('since') || 0)
    if (!Number.isFinite(since) || since < 0) return send(response, 400, { error: 'Invalid cursor' })
    return send(response, 200, { records: feed.filter(item => item.cursor > since).map(item => item.record), cursor: String(cursor) })
  }
  if (request.method === 'POST' && url.pathname === '/sync/push') {
    let body
    try { body = await readBody(request) } catch { return send(response, 400, { error: 'Invalid JSON body' }) }
    if (!body.deviceId || !Array.isArray(body.ops)) return send(response, 400, { error: 'Expected deviceId and ops[]' })
    return send(response, 200, { results: body.ops.map(op => apply(op)) })
  }
  if (url.pathname === '/health' || url.pathname.startsWith('/sync/')) return send(response, 405, { error: 'Method not allowed' })
  return send(response, 404, { error: 'Not found' })
}).listen(3000, () => console.log(`FieldSync mock API listening on http://localhost:3000${forceConflict ? ' (one forced conflict armed)' : ''}`))

