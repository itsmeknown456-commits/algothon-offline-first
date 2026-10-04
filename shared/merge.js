/**
 * Merges local changes with the server state using a three-way merge approach (Base, Local, Server).
 * @param {Object|null} base - The last known snapshot of the task before going offline.
 * @param {Object|null} local - The current version modified locally on the client.
 * @param {Object|null} server - The current version currently saved on the server.
 * @returns {Object} { merged: Object|null, conflicts: Array }
 */
function merge(base, local, server) {
  let merged = null;
  let conflicts = [];

  // Case 1: Item was deleted on server or local
  // If server deleted it, but local tried to update -> Conflict
  // If local deleted it, but server changed it -> Conflict
  
  // If server and local are identical, no change needed
  if (JSON.stringify(local) === JSON.stringify(server)) {
    return { merged: server, conflicts: [] };
  }

  // If server equals base, no concurrent edits on server; safe to take local
  if (JSON.stringify(base) === JSON.stringify(server)) {
    return { merged: local, conflicts: [] };
  }

  // If local equals base, no local changes; safe to take server
  if (JSON.stringify(base) === JSON.stringify(local)) {
    return { merged: server, conflicts: [] };
  }

  // If both changed differently from base -> CONFLICT DETECTED
  // Compare specific fields (e.g., title, description, status)
  merged = { ...server }; // Default fallback to server version
  
  conflicts.push({
    id: local.id || server.id,
    localVersion: local,
    serverVersion: server,
    baseVersion: base,
    message: "Concurrent modifications detected on both local and server."
  });

  return { merged, conflicts };
}

module.exports = { merge };
