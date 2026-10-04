const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to SQLite database (creates hackathon.db in the server folder)
const dbPath = path.resolve(__dirname, '../hackathon.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

// Initialize database tables
db.serialize(() => {
  // 1. Tasks table: stores current state of tasks
  db.run(`CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending',
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER DEFAULT NULL
  )`);

  // 2. Task snapshots table: stores base states for conflict resolution
  db.run(`CREATE TABLE IF NOT EXISTS task_snapshots (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT,
    updated_at INTEGER NOT NULL
  )`);

  // 3. Applied ops table: tracks operation IDs to prevent duplicate processing (opId dedupe)
  db.run(`CREATE TABLE IF NOT EXISTS applied_ops (
    op_id TEXT PRIMARY KEY,
    applied_at INTEGER NOT NULL
  )`);
});

module.exports = db;
