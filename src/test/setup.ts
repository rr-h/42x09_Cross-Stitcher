import '@testing-library/jest-dom';

// Mock crypto.subtle for tests
const globalAny = globalThis as Record<string, unknown>;
if (typeof globalAny.crypto === 'undefined') {
  globalAny.crypto = {
    subtle: {
      digest: async (_algorithm: string, data: ArrayBuffer) => {
        // Simple mock hash for testing
        const arr = new Uint8Array(data);
        const hash = new Uint8Array(32);
        for (let i = 0; i < arr.length; i++) {
          hash[i % 32] ^= arr[i];
        }
        return hash.buffer;
      },
    },
  };
}

// Mock IndexedDB for tests
class MockIDBRequest {
  result: unknown = null;
  error: Error | null = null;
  onsuccess: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
}

class MockIDBObjectStore {
  private store: Map<string, unknown>;

  constructor(store: Map<string, unknown>) {
    this.store = store;
  }

  put(value: Record<string, unknown>) {
    const key = value.patternId as string;
    this.store.set(key, value);
    const request = new MockIDBRequest();
    request.result = key;
    setTimeout(() => request.onsuccess?.(new Event('success')), 0);
    return request;
  }

  get(key: string) {
    const request = new MockIDBRequest();
    request.result = this.store.get(key);
    setTimeout(() => request.onsuccess?.(new Event('success')), 0);
    return request;
  }

  delete(key: string) {
    this.store.delete(key);
    const request = new MockIDBRequest();
    setTimeout(() => request.onsuccess?.(new Event('success')), 0);
    return request;
  }
}

class MockIDBTransaction {
  private stores: Map<string, Map<string, unknown>>;

  constructor(stores: Map<string, Map<string, unknown>>) {
    this.stores = stores;
  }

  objectStore(name: string) {
    if (!this.stores.has(name)) {
      this.stores.set(name, new Map());
    }
    return new MockIDBObjectStore(this.stores.get(name)!);
  }
}

class MockIDBDatabase {
  private stores = new Map<string, Map<string, unknown>>();
  objectStoreNames = { contains: (name: string) => this.stores.has(name) };

  createObjectStore(name: string) {
    this.stores.set(name, new Map());
    return new MockIDBObjectStore(this.stores.get(name)!);
  }

  transaction(_storeNames: string | string[]) {
    return new MockIDBTransaction(this.stores);
  }
}

if (typeof globalAny.indexedDB === 'undefined') {
  globalAny.indexedDB = {
    open: (_name: string) => {
      const request = new MockIDBRequest();
      const db = new MockIDBDatabase();
      request.result = db;
      setTimeout(() => request.onsuccess?.(new Event('success')), 0);
      return request;
    },
  };
}
