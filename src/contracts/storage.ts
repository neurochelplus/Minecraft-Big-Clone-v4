export interface IStorage {
  init(): Promise<void>;
  set<T>(key: string, value: T, store?: string): Promise<void>;
  get<T>(key: string, store?: string): Promise<T | undefined>;
  delete(key: string, store?: string): Promise<void>;
  keys(store?: string): Promise<IDBValidKey[]>;
  clear(): Promise<void>;
  hasSavedData(): Promise<boolean>;
}
