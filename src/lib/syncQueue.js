import {
  getSyncQueue,
  updateSyncQueueItem,
  removeSyncQueueItem,
  markTransactionSynced,
  markTransactionConflict,
} from './offlineStore';
import { supabase } from './supabaseClient';

// Retry delays in milliseconds
const RETRY_DELAYS = [
  0, // Immediate
  5000, // 5 seconds
  30000, // 30 seconds
  300000, // 5 minutes
  900000, // 15 minutes
];

const MAX_ATTEMPTS = 10;

let isSyncing = false;
let syncListeners = [];

// Add listener for sync events
export function addSyncListener(callback) {
  syncListeners.push(callback);
  return () => {
    syncListeners = syncListeners.filter((cb) => cb !== callback);
  };
}

// Notify all listeners of sync state changes
function notifySyncListeners(event) {
  syncListeners.forEach((cb) => cb(event));
}

// Process a single queue item
async function processQueueItem(item) {
  const { operation, transactionId, payload: _payload } = item;

  try {
    switch (operation) {
      case 'create':
        return await processCreate(item);
      case 'update':
        return await processUpdate(item);
      case 'delete':
        return await processDelete(item);
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  } catch (error) {
    console.error(`Sync error for ${transactionId}:`, error);
    throw error;
  }
}

// Process a create operation
async function processCreate(item) {
  const { transactionId, payload } = item;

  // Remove offline-specific fields
  const {
    _syncStatus,
    _localVersion,
    _serverVersion,
    _offlineCreatedAt,
    month: _month,
    ...serverPayload
  } = payload;

  // Also remove the offline ID - server will generate a new UUID
  const { id: _id, ...insertPayload } = serverPayload;

  const { data, error } = await supabase
    .from('transactions')
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    throw error;
  }

  // Update local store with server-assigned ID
  await markTransactionSynced(transactionId, data.id, data);
  await removeSyncQueueItem(item.id);

  return { success: true, serverId: data.id };
}

// Process an update operation
async function processUpdate(item) {
  const { transactionId, payload } = item;

  // First, check for conflicts by fetching current server state
  const { data: serverData, error: fetchError } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      // Transaction was deleted on server
      await removeSyncQueueItem(item.id);
      return { success: false, reason: 'deleted_on_server' };
    }
    throw fetchError;
  }

  // Check for conflict based on updated_at
  // If we have a stored server version and it's different, there's a conflict
  if (
    payload._serverVersion &&
    serverData.updated_at !== payload._serverVersion
  ) {
    await markTransactionConflict(transactionId, serverData);
    await removeSyncQueueItem(item.id);
    notifySyncListeners({
      type: 'conflict',
      transactionId,
      localChange: payload,
      serverData,
    });
    return { success: false, reason: 'conflict', serverData };
  }

  // No conflict, proceed with update
  const {
    _syncStatus,
    _localVersion,
    _serverVersion,
    _offlineCreatedAt,
    month: _month,
    id: _id,
    ...updatePayload
  } = payload;

  const { data, error } = await supabase
    .from('transactions')
    .update(updatePayload)
    .eq('id', transactionId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  // Update local store with new server state
  await markTransactionSynced(transactionId, data.id, data);
  await removeSyncQueueItem(item.id);

  return { success: true };
}

// Process a delete operation
async function processDelete(item) {
  const { transactionId } = item;

  // Use the soft delete RPC if available
  const { error } = await supabase.rpc('soft_delete_transaction', {
    p_transaction_id: transactionId,
  });

  if (error) {
    // If transaction doesn't exist, that's fine - it's already deleted
    if (error.code !== 'PGRST116') {
      throw error;
    }
  }

  await removeSyncQueueItem(item.id);

  return { success: true };
}

// Get delay for retry attempt
function getRetryDelay(attempts) {
  const index = Math.min(attempts, RETRY_DELAYS.length - 1);
  return RETRY_DELAYS[index];
}

// Process the entire sync queue
export async function processSync() {
  if (isSyncing) {
    return { alreadySyncing: true };
  }

  isSyncing = true;
  notifySyncListeners({ type: 'start' });

  const results = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    conflicts: 0,
  };

  try {
    const queue = await getSyncQueue();

    for (const item of queue) {
      // Check if we should skip this item based on retry delay
      if (item.attempts > 0) {
        const delay = getRetryDelay(item.attempts);
        const lastAttempt = item.lastAttemptAt
          ? new Date(item.lastAttemptAt).getTime()
          : 0;
        const nextAttempt = lastAttempt + delay;

        if (Date.now() < nextAttempt) {
          continue; // Skip, not ready for retry yet
        }
      }

      // Check if max attempts exceeded
      if (item.attempts >= MAX_ATTEMPTS) {
        results.failed++;
        notifySyncListeners({
          type: 'max_attempts',
          transactionId: item.transactionId,
          error: item.lastError,
        });
        continue;
      }

      results.processed++;

      try {
        const result = await processQueueItem(item);

        if (result.success) {
          results.succeeded++;
          notifySyncListeners({
            type: 'synced',
            transactionId: item.transactionId,
            serverId: result.serverId,
          });
        } else if (result.reason === 'conflict') {
          results.conflicts++;
        }
      } catch (error) {
        results.failed++;

        // Update item with failure info
        await updateSyncQueueItem(item.id, {
          attempts: item.attempts + 1,
          lastAttemptAt: new Date().toISOString(),
          lastError: error.message || 'Unknown error',
        });

        notifySyncListeners({
          type: 'error',
          transactionId: item.transactionId,
          error: error.message,
          attempts: item.attempts + 1,
        });
      }

      // Small delay between items to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  } finally {
    isSyncing = false;
    notifySyncListeners({ type: 'complete', results });
  }

  return results;
}

// Check if sync is currently in progress
export function isSyncInProgress() {
  return isSyncing;
}

// Schedule sync with debounce
let syncTimeout = null;

export function scheduleSync(delayMs = 1000) {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }

  syncTimeout = setTimeout(() => {
    syncTimeout = null;
    if (navigator.onLine) {
      processSync();
    }
  }, delayMs);
}

// Cancel scheduled sync
export function cancelScheduledSync() {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
    syncTimeout = null;
  }
}
