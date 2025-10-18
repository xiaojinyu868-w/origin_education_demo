export type StorageAccessors = {
  get: (key: string) => string | null;
  set: (key: string, value: string) => void;
  remove: (key: string) => void;
};

const hasWindowStorage = () => typeof window !== "undefined" && !!window.localStorage;

const logStorageError = (error: unknown) => {
  if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
    console.warn("localStorage access failed", error);
  }
};

export const safeStorage: StorageAccessors = {
  get: (key) => {
    if (!hasWindowStorage()) {
      return null;
    }
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      logStorageError(error);
      return null;
    }
  },
  set: (key, value) => {
    if (!hasWindowStorage()) {
      return;
    }
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      logStorageError(error);
    }
  },
  remove: (key) => {
    if (!hasWindowStorage()) {
      return;
    }
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      logStorageError(error);
    }
  },
};
