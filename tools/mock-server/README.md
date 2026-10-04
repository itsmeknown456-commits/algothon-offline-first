# FieldSync mock API

This Node built-in-only server implements the client endpoints documented in [`docs/API.md`](../../docs/API.md). It stores records in memory and listens on port 3000, which the Vite development proxy already targets.

From the repository root, start a normal mock server:

```powershell
node tools/mock-server/server.js
```

To force one conflict on the next pushed op, start it in PowerShell with:

```powershell
$env:MOCK_FORCE_CONFLICT = "1"
node tools/mock-server/server.js
```

The conflict returns a changed server copy and common-base copy; the flag is consumed once so a resolver update can then sync normally. Stop the server with Ctrl+C. Data and operation IDs live only in process memory and reset when the process restarts. Use a separate terminal for `cd client; npm run dev`, then open the Vite URL (usually `http://localhost:5173/`).
