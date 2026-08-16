import { ProfileRepository, type KeyValueStore } from './repository';

const DATABASE_NAME = 'quantum-catch-davel';
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
    this.databasePromise ??= new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
      request.addEventListener('upgradeneeded', () => {
        if (!request.result.objectStoreNames.contains(OBJECT_STORE)) request.result.createObjectStore(OBJECT_STORE);
      });
      request.addEventListener('success', () => resolve(request.result), { once: true });
      request.addEventListener('error', () => reject(request.error ?? new Error('Unable to open profile database')), { once: true });
      request.addEventListener('blocked', () => reject(new Error('Profile database upgrade is blocked')), { once: true });
    });
    return this.databasePromise;
  }
}

export function createBrowserProfileRepository(): ProfileRepository {
  return new ProfileRepository(new IndexedDbKeyValueStore());
}
