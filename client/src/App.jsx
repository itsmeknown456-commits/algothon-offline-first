import React, { useState, useEffect } from 'react';
import { useTasks } from './useTasks';

export default function App() {
  const { tasks, loading, saveTask } = useTasks();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newTask = {
      id: 'task_' + Date.now(),
      title,
      description,
      status: 'PENDING',
      updatedAt: Date.now()
    };

    await saveTask(newTask);
    setTitle('');
    setDescription('');
  };

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', fontFamily: 'system-ui, sans-serif', padding: '0 20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>ALG-WEB-02 Task Board</h1>
        <span style={{ 
          padding: '6px 12px', 
          borderRadius: '12px', 
          fontSize: '14px', 
          fontWeight: 'bold',
          background: isOnline ? '#d1e7dd' : '#f8d7da', 
          color: isOnline ? '#0f5132' : '#842029' 
        }}>
          {isOnline ? '🟢 Online' : '🔴 Offline Mode'}
        </span>
      </header>

      <form onSubmit={handleSubmit} style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '25px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <h3>Create New Task</h3>
        <div style={{ marginBottom: '12px' }}>
          <input
            type="text"
            placeholder="Task Title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ width: '100%', padding: '10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ced4da' }}
          />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <textarea
            placeholder="Description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ width: '100%', padding: '10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ced4da', resize: 'vertical' }}
          />
        </div>
        <button type="submit" style={{ background: '#0d6efd', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          Add Task
        </button>
      </form>

      <div>
        <h3>Your Tasks</h3>
        {loading ? (
          <p>Loading local tasks...</p>
        ) : tasks.length === 0 ? (
          <p style={{ color: '#6c757d' }}>No tasks found. Create one above to get started!</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {tasks.map((task) => (
              <li key={task.id} style={{ background: 'white', border: '1px solid #dee2e6', padding: '15px', borderRadius: '6px', marginBottom: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <h4 style={{ margin: '0 0 5px 0' }}>{task.title}</h4>
                <p style={{ margin: '0 0 10px 0', color: '#495057' }}>{task.description || 'No description'}</p>
                <small style={{ color: '#6c757d' }}>Status: {task.status}</small>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
