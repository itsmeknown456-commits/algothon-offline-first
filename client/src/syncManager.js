import { openClientDB } from './db';

// Generate a unique operation ID (UUID v4-like or timestamp random)
export function generateOpId() {
  return 'op_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
}

// Enqueue a local mutation when offline or online
export async function enqueueMutation(type, data) {
  const db = await openClientDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('mutation_queue', 'readwrite');
    const store = transaction.objectStore('mutation_queue');
    const op = {
      opId: generateOpId(),
      type, // 'CREATE', 'UPDATE', 'DELETE'
      data,
      timestamp: Date.now()
    };
    const request = store.put(op);
    request.onsuccess = () => resolve(op);
    request.onerror = () => reject(request.error);
  });
}

// Push all queued mutations to the backend server
export async function syncQueue(serverUrl = 'http://localhost:4000') {
  if (!navigator.onLine) {
    console.log('Device is offline. Sync postponed.');
    return { success: false, reason: 'offline' };
  }

  const db = await openClientDB();
  
  // 1. Fetch all queued ops
  const ops = await new Promise((resolve, reject) => {
    const transaction = db.transaction('mutation_queue', 'readonly');
    const store = transaction.objectStore('mutation_queue');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  if (ops.length === 0) {
    return { success: true, processedCount: 0 };
  }

  try {
    // 2. Send ops to backend push endpoint
    const response = await fetch(`${serverUrl}/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ops })
    });

    if (!response.ok) {
      throw new Error('Sync push failed with status ' + response.status);
    }

    const result = await response.json();

    // 3. Clear successfully synced ops from local queue
    const clearTransaction = db.transaction('mutation_queue', 'readwrite');
    const clearStore = clearTransaction.objectStore('mutation_queue');
    
    for (const op of ops) {
      clearStore.delete(op.opId);
    }

    return { success: true, result };
  } catch (err) {
    console.error('Sync error:', err);
    return { success: false, error: err.message };
  }
}

// Listen for network connectivity changes to trigger automatic syncing
window.addEventListener('online', () => {
  console.log('Network online. Triggering background sync...');
  syncQueue();
});
