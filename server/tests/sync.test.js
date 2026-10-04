const express = require('express');
const request = require('supertest');
const syncRouter = require('../src/sync');

const app = express();
app.use(express.json());
app.use('/sync', syncRouter);

describe('Sync API Endpoints', () => {
  test('POST /sync/push should reject invalid payload without ops array', async () => {
    const response = await request(app)
      .post('/sync/push')
      .send({ ops: 'invalid-data' });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  test('GET /sync/pull should return tasks and server time', async () => {
    const response = await request(app)
      .get('/sync/pull');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('serverTime');
    expect(Array.isArray(response.body.tasks)).toBe(true);
  });
});
