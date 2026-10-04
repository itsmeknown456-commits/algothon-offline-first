const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const syncRouter = require('./sync');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// 1. Health Endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// 2. Sync Router Endpoints (/sync/push, /sync/pull)
app.use('/sync', syncRouter);

// 3. Serve Frontend Static Build (client/dist)
const clientDistPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

// SPA fallback middleware (avoids path-to-regexp syntax errors)
app.use((req, res, next) => {
  if (req.path.startsWith('/sync') || req.path === '/health') {
    return next();
  }
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) {
      res.status(404).send('Frontend build not found. Make sure client/dist is built.');
    }
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
