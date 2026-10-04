# FieldSync client API

The development client uses Vite's proxy to forward these same-origin requests to `http://localhost:3000`. The client calls only the endpoints below. Sync outcome statuses are inside the JSON response; a task conflict is returned with HTTP 200 so the client can inspect its per-operation result.

## Task record

```json
{
  "id": "uuid",
  "title": "Inspect site",
  "status": "todo",
  "priority": "med",
  "assignee": "Ari",
  "notes": "Bring the checklist",
  "version": 2,
  "deleted": false,
  "updatedAt": "2026-10-04T08:00:00.000Z"
}
```

`status` is `todo`, `doing`, or `done`; `priority` is `low`, `med`, or `high`. `syncState` and `conflict` are local-only fields and are not sent as task fields.

## `GET /health`

No request body.

- **200 OK**: `{"ok":true}`. This means the API is reachable; the client then starts sync.
- Any non-2xx response or network failure is treated as offline and retried with exponential backoff, capped at 60 seconds.

## `POST /sync/push`

The client sends queued operations in Dexie sequence order, one operation per request, wrapped in the contract's `ops` array.

```json
{
  "deviceId": "uuid",
  "ops": [
    {
      "opId": "uuid",
      "entityId": "task-uuid",
      "type": "create",
      "baseVersion": 0,
      "changes": {
        "id": "task-uuid",
        "title": "Inspect site",
        "status": "todo",
        "priority": "med",
        "assignee": "Ari",
        "notes": "Bring the checklist",
        "version": 0,
        "deleted": false,
        "updatedAt": "2026-10-04T08:00:00.000Z"
      }
    }
  ]
}
```

`type` is `create`, `update`, or `delete`. Update `changes` contains the modified task fields; delete sends `{ "deleted": true }`. The local `syncState` field is never included. The server should process the `ops` array in order and make `opId` idempotent. The client currently sends a one-element array per request and advances later same-task operations' `baseVersion` from each successful server version.

### Push response

**200 OK** returns one result per submitted op:

```json
{
  "results": [
    {
      "opId": "uuid",
      "status": "applied",
      "record": { "id": "task-uuid", "title": "Inspect site", "status": "todo", "priority": "med", "assignee": "Ari", "notes": "Bring the checklist", "version": 1, "deleted": false, "updatedAt": "2026-10-04T08:00:01.000Z" }
    }
  ]
}
```

Supported per-op `status` values are `applied`, `duplicate`, `conflict`, and `error`. `record` is the server's task copy after applying the operation, or the current server copy for a conflict. It is required for `applied`, `duplicate`, and `conflict` results.

For `conflict`, also return `base`, the common-ancestor Task record:

```json
{
  "results": [
    {
      "opId": "uuid",
      "status": "conflict",
      "record": { "id": "task-uuid", "title": "Server title", "status": "doing", "priority": "high", "assignee": "Ari", "notes": "Server notes", "version": 3, "deleted": false, "updatedAt": "2026-10-04T08:10:00.000Z" },
      "base": { "id": "task-uuid", "title": "Earlier title", "status": "todo", "priority": "med", "assignee": "Ari", "notes": "Earlier notes", "version": 2, "deleted": false, "updatedAt": "2026-10-04T08:00:00.000Z" }
    }
  ]
}
```

The client stores the server `record` and `base` on the local task, clears queued ops for that task, and lets the user resolve each differing field. `error` leaves the op queued and marks the task failed so it can be retried. The client treats a non-2xx response (including **400 Bad Request** for an invalid envelope or **500 Internal Server Error** for a server failure) as a network/sync failure and retries. Use HTTP 200 for the per-op `error` status so it is distinguishable from a failed request.

## `GET /sync/pull?since=<cursor>`

No request body. The initial cursor is the empty string. The client URL-encodes the stored cursor.

- **200 OK**:

```json
{
  "records": [
    { "id": "task-uuid", "title": "Inspect site", "status": "done", "priority": "med", "assignee": "Ari", "notes": "Complete", "version": 4, "deleted": false, "updatedAt": "2026-10-04T08:20:00.000Z" }
  ],
  "cursor": "next-cursor"
}
```

Return records changed after the supplied cursor (including tombstones with `deleted: true`) and a cursor the client can persist for the next pull. The client preserves any local task with pending, failed, or conflict state instead of overwriting it with a pull result.

A non-2xx response or invalid/unreachable API is treated as a sync failure and retried. The development proxy forwards `/health` and `/sync` to port 3000; `npm run dev` serves the UI separately, usually on port 5173.
