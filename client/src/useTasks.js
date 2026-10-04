import { useState, useEffect } from 'react';
import { openClientDB } from './db';
import { enqueueMutation, syncQueue } from './syncManager';

export function useTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load tasks from local IndexedDB on mount
  const loadLocalTasks = async () => {
    try {
      const db = await openClientDB();
      const transaction = db.transaction('tasks', 'readonly');
      const store = transaction.objectStore('tasks');
      const request = store.getAll();

      request.onsuccess = () => {
        setTasks(request.result);
        setLoading(false);
      };
    } catch (err) {
      console.error('Failed to load local tasks:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLocalTasks();
    // Attempt background sync on mount
    syncQueue().then(() => loadLocalTasks());
  }, []);

  // Add or update a task locally and queue the mutation
  const saveTask = async (taskData) => {
    const db = await openClientDB();
    
    // 1. Save locally in 'tasks' store
    await new Promise((resolve, reject) => {
      const tx = db.transaction('tasks', 'readwrite');
      const store = tx.objectStore('tasks');
      const req = store.put(taskData);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    // 2. Enqueue mutation for server synchronization
    await enqueueMutation('UPSERT', taskData);

    // 3. Refresh local state
    await loadLocalTasks();

    // 4. Try syncing immediately if online
    if (navigator.onLine) {
      await syncQueue();
      await loadLocalTasks();
    }
  };

  return { tasks, loading, saveTask, refreshTasks: loadLocalTasks };
}
