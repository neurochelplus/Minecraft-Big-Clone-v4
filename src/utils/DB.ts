export class DB {
  private dbName: string;
  private storeName: string;
  private db: IDBDatabase | null = null;

  constructor(
    dbName: string = "minecraft-world-tall",
    storeName: string = "chunks",
  ) {
    this.dbName = dbName;
    this.storeName = storeName;
  }

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 3);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta");
        }
        if (!db.objectStoreNames.contains("blockEntities")) {
          db.createObjectStore("blockEntities");
        }
      };
    });
  }

  async set<T>(
    key: string,
    value: T,
    store: string = this.storeName,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject("DB not initialized");
      const transaction = this.db.transaction([store], "readwrite");
      const objectStore = transaction.objectStore(store);
      const request = objectStore.put(value, key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async get<T>(key: string, store: string = this.storeName): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject("DB not initialized");
      const transaction = this.db.transaction([store], "readonly");
      const objectStore = transaction.objectStore(store);
      const request = objectStore.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result as T | undefined);
    });
  }

  async delete(key: string, store: string = this.storeName): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject("DB not initialized");
      const transaction = this.db.transaction([store], "readwrite");
      const objectStore = transaction.objectStore(store);
      const request = objectStore.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async keys(store: string = this.storeName): Promise<IDBValidKey[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject("DB not initialized");
      const transaction = this.db.transaction([store], "readonly");
      const objectStore = transaction.objectStore(store);
      const request = objectStore.getAllKeys();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async keysByPrefix(store: string, prefix: string): Promise<string[]> {
    const allKeys = await this.keys(store);
    const stringKeys: string[] = [];

    for (const key of allKeys) {
      if (typeof key === "string" && key.startsWith(prefix)) {
        stringKeys.push(key);
      }
    }

    return stringKeys;
  }

  async deleteMany(store: string, keys: string[]): Promise<void> {
    if (keys.length === 0) {
      return;
    }

    return new Promise((resolve, reject) => {
      if (!this.db) return reject("DB not initialized");
      const transaction = this.db.transaction([store], "readwrite");
      const objectStore = transaction.objectStore(store);

      transaction.onerror = () => reject(transaction.error);
      transaction.oncomplete = () => resolve();

      for (const key of keys) {
        objectStore.delete(key);
      }
    });
  }

  async clear(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject("DB not initialized");
      const transaction = this.db.transaction(
        [this.storeName, "meta"],
        "readwrite",
      );

      transaction.onerror = () => reject(transaction.error);
      transaction.oncomplete = () => resolve();

      transaction.objectStore(this.storeName).clear();
      transaction.objectStore("meta").clear();
    });
  }

  async hasSavedData(): Promise<boolean> {
    try {
      if (!this.db) await this.init();
      const worlds = await this.get<unknown[]>("worlds:index", "meta");
      return Array.isArray(worlds) && worlds.length > 0;
    } catch (_e) {
      return false;
    }
  }
}

export const worldDB = new DB();
