export interface IStorage {
  init(): Promise<void>;
  set<T>(key: string, value: T, store?: string): Promise<void>;
  get<T>(key: string, store?: string): Promise<T | undefined>;
  delete(key: string, store?: string): Promise<void>;
  keys(store?: string): Promise<IDBValidKey[]>;
  keysByPrefix(store: string, prefix: string): Promise<string[]>;
  deleteMany(store: string, keys: string[]): Promise<void>;
  clear(): Promise<void>;
  hasSavedData(): Promise<boolean>;
}
