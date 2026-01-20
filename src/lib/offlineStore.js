import { openDB } from 'idb';

const DB_NAME = 'chiribudget-offline';
const DB_VERSION = 1;

// Store names
const TRANSACTIONS_STORE = 'transactions';
const SYNC_QUEUE_STORE = 'syncQueue';
const CACHE_STORE = 'cachedData';

let dbPromise = null;
let currentHouseholdId = null;

// Initialize the database
function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Transactions store - offline and pending transactions
        if (!db.objectStoreNames.contains(TRANSACTIONS_STORE)) {
          const txnStore = db.createObjectStore(TRANSACTIONS_STORE, {
            keyPath: 'id',
          });
          txnStore.createIndex('by-household', 'household_id');
          txnStore.createIndex('by-month-currency', [
            'household_id',
            'month',
            'currency',
          ]);
          txnStore.createIndex('by-sync-status', '_syncStatus');
        }

        // Sync queue store - pending operations to sync
        if (!db.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
          const queueStore = db.createObjectStore(SYNC_QUEUE_STORE, {
            keyPath: 'id',
            autoIncrement: true,
          });
          queueStore.createIndex('by-created', 'createdAt');
        }

        // Cache store - cached server data
        if (!db.objectStoreNames.contains(CACHE_STORE)) {
          db.createObjectStore(CACHE_STORE, { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

// Initialize offline store with household ID
export async function initOfflineStore(householdId) {
  currentHouseholdId = householdId;
  await getDB(); // Ensure DB is initialized
}

// Generate offline transaction ID
function generateOfflineId() {
  return `offline_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// Extract month from date string (YYYY-MM)
function getMonth(dateStr) {
  return dateStr ? dateStr.slice(0, 7) : '';
}

// Get offline transactions filtered by month and currency
export async function getOfflineTransactions({ month, currency }) {
  const db = await getDB();
  const all = await db.getAll(TRANSACTIONS_STORE);

  return all.filter(
    (t) =>
      t.household_id === currentHouseholdId &&
      getMonth(t.txn_date) === month &&
      t.currency === currency &&
      t._syncStatus !== 'synced' // Only return pending/conflict items
  );
}

// Get all offline transactions for current household (unfiltered)
export async function getAllOfflineTransactions() {
  const db = await getDB();
  const all = await db.getAll(TRANSACTIONS_STORE);

  return all.filter(
    (t) => t.household_id === currentHouseholdId && t._syncStatus !== 'synced'
  );
}

// Add a new offline transaction
export async function addOfflineTransaction(transaction) {
  const db = await getDB();
  const id = generateOfflineId();

  const offlineTransaction = {
    ...transaction,
    id,
    household_id: currentHouseholdId,
    month: getMonth(transaction.txn_date),
    _syncStatus: 'pending',
    _localVersion: 1,
    _serverVersion: null,
    _offlineCreatedAt: new Date().toISOString(),
  };

  await db.put(TRANSACTIONS_STORE, offlineTransaction);

  // Add to sync queue
  await addToSyncQueue('create', id, offlineTransaction);

  return id;
}

// Update an offline transaction
export async function updateOfflineTransaction(id, updates) {
  const db = await getDB();
  const existing = await db.get(TRANSACTIONS_STORE, id);

  if (!existing) {
    throw new Error(`Transaction ${id} not found in offline store`);
  }

  const updated = {
    ...existing,
    ...updates,
    month: updates.txn_date ? getMonth(updates.txn_date) : existing.month,
    _localVersion: (existing._localVersion || 0) + 1,
    _syncStatus:
      existing._syncStatus === 'synced' ? 'pending' : existing._syncStatus,
  };

  await db.put(TRANSACTIONS_STORE, updated);

  // Add to sync queue if this was a synced transaction
  if (existing._syncStatus === 'synced') {
    await addToSyncQueue('update', id, updates);
  }
}

// Delete an offline transaction (soft delete for synced, hard delete for pending)
export async function deleteOfflineTransaction(id) {
  const db = await getDB();
  const existing = await db.get(TRANSACTIONS_STORE, id);

  if (!existing) {
    return; // Already deleted
  }

  if (existing._syncStatus === 'pending' && id.startsWith('offline_')) {
    // Never synced, just remove it and its queue entry
    await db.delete(TRANSACTIONS_STORE, id);
    await removeFromSyncQueue(id);
  } else {
    // Was synced, queue a delete operation
    await db.delete(TRANSACTIONS_STORE, id);
    await addToSyncQueue('delete', id, { id });
  }
}

// Get count of pending sync items
export async function getPendingSyncCount() {
  const db = await getDB();
  const queue = await db.getAll(SYNC_QUEUE_STORE);
  return queue.length;
}

// Add operation to sync queue
async function addToSyncQueue(operation, transactionId, payload) {
  const db = await getDB();

  // Check if there's already a pending operation for this transaction
  const existing = await db.getAll(SYNC_QUEUE_STORE);
  const existingOp = existing.find((op) => op.transactionId === transactionId);

  if (existingOp) {
    // Update existing queue entry instead of creating new one
    if (operation === 'delete') {
      // Delete supersedes create/update
      await db.put(SYNC_QUEUE_STORE, {
        ...existingOp,
        operation: 'delete',
        payload: { id: transactionId },
      });
    } else if (existingOp.operation === 'create') {
      // Update the create payload with new data
      await db.put(SYNC_QUEUE_STORE, {
        ...existingOp,
        payload: { ...existingOp.payload, ...payload },
      });
    } else {
      // Merge update payloads
      await db.put(SYNC_QUEUE_STORE, {
        ...existingOp,
        payload: { ...existingOp.payload, ...payload },
      });
    }
  } else {
    await db.add(SYNC_QUEUE_STORE, {
      operation,
      transactionId,
      payload,
      createdAt: new Date().toISOString(),
      attempts: 0,
      lastError: null,
    });
  }
}

// Remove from sync queue
async function removeFromSyncQueue(transactionId) {
  const db = await getDB();
  const all = await db.getAll(SYNC_QUEUE_STORE);
  const entry = all.find((op) => op.transactionId === transactionId);
  if (entry) {
    await db.delete(SYNC_QUEUE_STORE, entry.id);
  }
}

// Get all sync queue items (for processing)
export async function getSyncQueue() {
  const db = await getDB();
  const queue = await db.getAll(SYNC_QUEUE_STORE);
  // Sort by createdAt for FIFO processing
  return queue.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

// Update sync queue item (e.g., increment attempts, set error)
export async function updateSyncQueueItem(id, updates) {
  const db = await getDB();
  const existing = await db.get(SYNC_QUEUE_STORE, id);
  if (existing) {
    await db.put(SYNC_QUEUE_STORE, { ...existing, ...updates });
  }
}

// Remove sync queue item after successful sync
export async function removeSyncQueueItem(id) {
  const db = await getDB();
  await db.delete(SYNC_QUEUE_STORE, id);
}

// Mark a transaction as synced (after successful server sync)
export async function markTransactionSynced(offlineId, serverId, serverData) {
  const db = await getDB();

  // Remove old offline entry
  await db.delete(TRANSACTIONS_STORE, offlineId);

  // Store with server ID and data
  await db.put(TRANSACTIONS_STORE, {
    ...serverData,
    id: serverId,
    household_id: currentHouseholdId,
    month: getMonth(serverData.txn_date),
    _syncStatus: 'synced',
    _localVersion: 1,
    _serverVersion: serverData.updated_at,
    _offlineCreatedAt: null,
  });
}

// Mark a transaction as having a conflict
export async function markTransactionConflict(id, serverData) {
  const db = await getDB();
  const existing = await db.get(TRANSACTIONS_STORE, id);

  if (existing) {
    await db.put(TRANSACTIONS_STORE, {
      ...existing,
      _syncStatus: 'conflict',
      _serverData: serverData,
    });
  }
}

// Cache server transactions (for offline reads)
export async function cacheTransactions(month, currency, transactions) {
  const db = await getDB();
  const key = `${currentHouseholdId}_${month}_${currency}`;

  await db.put(CACHE_STORE, {
    key,
    data: transactions,
    fetchedAt: new Date().toISOString(),
    householdId: currentHouseholdId,
  });

  // Also store individual transactions as synced
  for (const txn of transactions) {
    await db.put(TRANSACTIONS_STORE, {
      ...txn,
      household_id: currentHouseholdId,
      month: getMonth(txn.txn_date),
      _syncStatus: 'synced',
      _localVersion: 1,
      _serverVersion: txn.updated_at,
      _offlineCreatedAt: null,
    });
  }
}

// Get cached transactions
export async function getCachedTransactions({ month, currency }) {
  const db = await getDB();
  const key = `${currentHouseholdId}_${month}_${currency}`;
  const cached = await db.get(CACHE_STORE, key);

  if (!cached) {
    return null;
  }

  // Check if cache is stale (older than 1 hour)
  const cacheAge = Date.now() - new Date(cached.fetchedAt).getTime();
  const ONE_HOUR = 60 * 60 * 1000;

  return {
    data: cached.data,
    isStale: cacheAge > ONE_HOUR,
    fetchedAt: cached.fetchedAt,
  };
}

// Clear all offline data (useful for logout or reset)
export async function clearOfflineStore() {
  const db = await getDB();
  await db.clear(TRANSACTIONS_STORE);
  await db.clear(SYNC_QUEUE_STORE);
  await db.clear(CACHE_STORE);
  currentHouseholdId = null;
}

// Get conflicts that need user attention
export async function getConflicts() {
  const db = await getDB();
  const all = await db.getAll(TRANSACTIONS_STORE);

  return all.filter(
    (t) => t.household_id === currentHouseholdId && t._syncStatus === 'conflict'
  );
}

// Resolve a conflict by accepting server data
export async function resolveConflict(id) {
  const db = await getDB();
  const existing = await db.get(TRANSACTIONS_STORE, id);

  if (existing && existing._syncStatus === 'conflict' && existing._serverData) {
    await db.put(TRANSACTIONS_STORE, {
      ...existing._serverData,
      id,
      household_id: currentHouseholdId,
      month: getMonth(existing._serverData.txn_date),
      _syncStatus: 'synced',
      _localVersion: 1,
      _serverVersion: existing._serverData.updated_at,
      _offlineCreatedAt: null,
      _serverData: undefined,
    });
  }
}
