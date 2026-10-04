const { merge } = require('../../shared/merge');

describe('Three-Way Merge Algorithm', () => {
  test('should return server version if local and server are identical', () => {
    const base = { id: '1', title: 'Task 1', status: 'pending' };
    const local = { id: '1', title: 'Task 1', status: 'pending' };
    const server = { id: '1', title: 'Task 1', status: 'pending' };

    const result = merge(base, local, server);
    expect(result.merged).toEqual(server);
    expect(result.conflicts).toHaveLength(0);
  });

  test('should accept local changes if server has not changed from base', () => {
    const base = { id: '1', title: 'Task 1', status: 'pending' };
    const local = { id: '1', title: 'Task 1 Updated', status: 'completed' };
    const server = { id: '1', title: 'Task 1', status: 'pending' };

    const result = merge(base, local, server);
    expect(result.merged).toEqual(local);
    expect(result.conflicts).toHaveLength(0);
  });

  test('should accept server changes if local has not changed from base', () => {
    const base = { id: '1', title: 'Task 1', status: 'pending' };
    const local = { id: '1', title: 'Task 1', status: 'pending' };
    const server = { id: '1', title: 'Task 1 Server Update', status: 'completed' };

    const result = merge(base, local, server);
    expect(result.merged).toEqual(server);
    expect(result.conflicts).toHaveLength(0);
  });

  test('should detect a conflict if both local and server changed differently', () => {
    const base = { id: '1', title: 'Task 1', status: 'pending' };
    const local = { id: '1', title: 'Task 1 Local Edit', status: 'pending' };
    const server = { id: '1', title: 'Task 1 Server Edit', status: 'completed' };

    const result = merge(base, local, server);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].id).toEqual('1');
  });
});
