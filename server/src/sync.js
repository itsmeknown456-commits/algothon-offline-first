const express = require('express');
const router = express.Router();
const db = require('./db');
const { merge } = require('../../shared/merge');

// 1. PUSH Endpoint: Receive offline changes from client
router.post('/push', (req, res) => {
  const { ops } = req.body; // Expects an array of operations: [{ opId, type, data }]

  if (!Array.isArray(ops)) {
    return res.status(400).json({ error: 'Invalid payload, ops array required.' });
  }

  let conflictsFound = [];
  let processedCount = 0;

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    const handleOp = (index) => {
      if (index >= ops.length) {
        db.run('COMMIT', (err) => {
          if (err) {
            return res.status(500).json({ error: 'Commit failed' });
          }
          return res.json({ success: true, processedCount, conflicts: conflictsFound });
        });
        return;
      }

      const op = ops[index];
      const { opId, type, data } = op;

      // Check for operation ID duplication (opId dedupe)
      db.get('SELECT * FROM applied_ops WHERE op_id = ?', [opId], (err, row) => {
        if (row) {
          // Already applied, skip safely
          processedCount++;
          return handleOp(index + 1);
        }

        // Handle based on operation type
        if (type === 'CREATE' || type === 'UPDATE') {
          db.get('SELECT * FROM tasks WHERE id = ?', [data.id], (err, serverTask) => {
            db.get('SELECT * FROM task_snapshots WHERE id = ?', [data.id], (err, baseSnapshot) => {
              
              if (serverTask && baseSnapshot) {
                // Perform 3-way merge check
                const mergeResult = merge(baseSnapshot, data, serverTask);
                if (mergeResult.conflicts.length > 0) {
                  conflictsFound.push(...mergeResult.conflicts);
                }
              }

              // Apply update/create to tasks and update snapshot & applied_ops
              const now = Date.now();
              db.run(
                `INSERT INTO tasks (id, title, description, status, updated_at) VALUES (?, ?, ?, ?, ?)
                 ON CONFLICT(id) DO UPDATE SET title=excluded.title, description=excluded.description, status=excluded.status, updated_at=excluded.updated_at`,
                [data.id, data.title, data.description || '', data.status || 'pending', data.updated_at || now]
              );

              db.run(
                `INSERT INTO task_snapshots (id, title, description, status, updated_at) VALUES (?, ?, ?, ?, ?)
                 ON CONFLICT(id) DO UPDATE SET title=excluded.title, description=excluded.description, status=excluded.status, updated_at=excluded.updated_at`,
                [data.id, data.title, data.description || '', data.status || 'pending', data.updated_at || now]
              );

              db.run('INSERT INTO applied_ops (op_id, applied_at) VALUES (?, ?)', [opId, now], () => {
                processedCount++;
                handleOp(index + 1);
              });
            });
          });
        } else if (type === 'DELETE') {
          const now = Date.now();
          db.run('UPDATE tasks SET deleted_at = ? WHERE id = ?', [now, data.id], () => {
            db.run('INSERT INTO applied_ops (op_id, applied_at) VALUES (?, ?)', [opId, now], () => {
              processedCount++;
              handleOp(index + 1);
            });
          });
        } else {
          handleOp(index + 1);
        }
      });
    };

    handleOp(0);
  });
});

// 2. PULL Endpoint: Send latest server tasks to client
router.get('/pull', (req, res) => {
  const { lastSync = 0 } = req.query;

  db.all('SELECT * FROM tasks WHERE updated_at > ? OR deleted_at > ?', [lastSync, lastSync], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch updates' });
    }
    res.json({ serverTime: Date.now(), tasks: rows });
  });
});

module.exports = router;
