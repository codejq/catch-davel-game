import { ProfileRepository, type KeyValueStore } from './repository';

const DATABASE_NAME = 'quantum-zama-sniper';
/** Where profiles lived before the game was renamed; copied across once, then removed. */
const LEGACY_DATABASE_NAME = 'quantum-catch-davel';
const DATABASE_VERSION = 1;
const OBJECT_STORE = 'profile-records';

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener('success', () => resolve(request.result), { once: true });
    request.addEventListener('error', () => reject(request.error ?? new Error('IndexedDB request failed')), { once: true });
  });
}

export class IndexedDbKeyValueStore implements KeyValueStore {
  private databasePromise: Promise<IDBDatabase> | null = null;

  async get(key: string): Promise<string | null> {
    const database = await this.database();
    const transaction = database.transaction(OBJECT_STORE, 'readonly');
    const result = await requestResult(transaction.objectStore(OBJECT_STORE).get(key) as IDBRequest<string | undefined>);
    return result ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    const database = await this.database();
    const transaction = database.transaction(OBJECT_STORE, 'readwrite');
    await requestResult(transaction.objectStore(OBJECT_STORE).put(value, key));
    await new Promise<void>((resolve, reject) => {
      transaction.addEventListener('complete', () => resolve(), { once: true });
      transaction.addEventListener('abort', () => reject(transaction.error ?? new Error('IndexedDB transaction aborted')), { once: true });
      transaction.addEventListener('error', () => reject(transaction.error ?? new Error('IndexedDB transaction failed')), { once: true });
    });
  }

  private database(): Promise<IDBDatabase> {
    this.databasePromise ??= openDatabase(DATABASE_NAME).then(async (database) => {
      const empty = (await requestResult(database.transaction(OBJECT_STORE, 'readonly').objectStore(OBJECT_STORE).count())) === 0;
      if (empty) await migrateLegacyProfiles(database).catch((error: unknown) => console.warn('Legacy profile migration skipped', error));
      return database;
    });
    return this.databasePromise;
  }
}

function openDatabase(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, DATABASE_VERSION);
    request.addEventListener('upgradeneeded', () => {
      if (!request.result.objectStoreNames.contains(OBJECT_STORE)) request.result.createObjectStore(OBJECT_STORE);
    });
    request.addEventListener('success', () => resolve(request.result), { once: true });
    request.addEventListener('error', () => reject(request.error ?? new Error('Unable to open profile database')), { once: true });
    request.addEventListener('blocked', () => reject(new Error('Profile database upgrade is blocked')), { once: true });
  });
}

/** Copies every record from the pre-rename database into an empty new one, then deletes the old database. */
async function migrateLegacyProfiles(target: IDBDatabase): Promise<void> {
  const legacy = await openDatabase(LEGACY_DATABASE_NAME);
  try {
    const store = legacy.transaction(OBJECT_STORE, 'readonly').objectStore(OBJECT_STORE);
    const keys = await requestResult(store.getAllKeys());
    const values = await requestResult(legacy.transaction(OBJECT_STORE, 'readonly').objectStore(OBJECT_STORE).getAll());
    if (keys.length === 0) return;
    const transaction = target.transaction(OBJECT_STORE, 'readwrite');
    keys.forEach((key, index) => transaction.objectStore(OBJECT_STORE).put(values[index], key));
    await new Promise<void>((resolve, reject) => {
      transaction.addEventListener('complete', () => resolve(), { once: true });
      transaction.addEventListener('abort', () => reject(transaction.error ?? new Error('Legacy migration aborted')), { once: true });
    });
  } finally {
    legacy.close();
    indexedDB.deleteDatabase(LEGACY_DATABASE_NAME);
  }
}

export function createBrowserProfileRepository(): ProfileRepository {
  return new ProfileRepository(new IndexedDbKeyValueStore());
}
