import type { Lesson } from "@/lib/lesson/schema";
import type { CharAlignment } from "@/lib/timeline/align";

export interface SavedLesson {
  version: 1;
  id: string;
  topic: string;
  title: string;
  lesson: Lesson;
  token: string;
  tokenExpiresAt: number;
  audio: Blob | null;
  mimeType: string | null;
  alignment: CharAlignment | null;
  normalizedAlignment: CharAlignment | null;
  duration: number;
  createdAt: number;
  lastOpenedAt: number;
}

export type SavedLessonSummary = Pick<
  SavedLesson,
  "version" | "id" | "topic" | "title" | "duration" | "createdAt" | "lastOpenedAt"
>;

const STORE = "lessons";
const MAX_LESSONS = 10;
const MAX_AUDIO_BYTES = 30 * 1024 * 1024;
let connection: Promise<IDBDatabase> | null = null;
let warned = false;

function warnOnce(error: unknown): void {
  if (warned) return;
  warned = true;
  console.warn("Lesson history is unavailable.", error);
}

async function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is unavailable");
  }
  if (connection) return connection;

  const pending = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("chalk", 1);
    let blocked = false;
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => {
      blocked = true;
      reject(new Error("Opening lesson history was blocked"));
    };
    request.onsuccess = () => {
      const db = request.result;
      // A blocked open can still succeed after its caller has received a failure.
      if (blocked) {
        db.close();
        return;
      }
      const forgetConnection = () => {
        if (connection === pending) connection = null;
      };
      db.onversionchange = () => {
        db.close();
        forgetConnection();
      };
      db.onclose = forgetConnection;
      resolve(db);
    };
  });
  connection = pending;
  try {
    return await pending;
  } catch (error) {
    if (connection === pending) connection = null;
    throw error;
  }
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fallback: T,
  operation: (store: IDBObjectStore) => Promise<T>,
): Promise<T> {
  try {
    const db = await openDatabase();
    const transaction = db.transaction(STORE, mode);
    const completed = new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onabort = transaction.onerror = () =>
        reject(transaction.error ?? new Error("Lesson history transaction failed"));
    });
    try {
      // Request success alone does not guarantee that a write has committed.
      const [result] = await Promise.all([
        Promise.resolve().then(() => operation(transaction.objectStore(STORE))),
        completed,
      ]);
      return result;
    } catch (error) {
      try {
        transaction.abort();
      } catch {
        // An IndexedDB error may have already aborted the transaction.
      }
      throw error;
    }
  } catch (error) {
    warnOnce(error);
    return fallback;
  }
}

function isSavedLesson(value: unknown): value is SavedLesson {
  return typeof value === "object" && value !== null && "version" in value && value.version === 1;
}

export async function isHistoryAvailable(): Promise<boolean> {
  try {
    await openDatabase();
    return true;
  } catch (error) {
    warnOnce(error);
    return false;
  }
}

export async function saveLesson(record: SavedLesson): Promise<boolean> {
  return withStore("readwrite", false, async (store) => {
    await requestResult(store.put(record));
    const records: {
      id: IDBValidKey;
      audio?: unknown;
      lastOpenedAt?: unknown;
      createdAt?: unknown;
    }[] = await requestResult(store.getAll());
    // Future record versions still consume storage, even though they cannot replay.
    const lessons = records.map((lesson) => ({
      id: lesson.id,
      bytes: lesson.audio instanceof Blob ? lesson.audio.size : 0,
      lastOpenedAt: typeof lesson.lastOpenedAt === "number" ? lesson.lastOpenedAt : 0,
      createdAt: typeof lesson.createdAt === "number" ? lesson.createdAt : 0,
    })).sort((a, b) => a.lastOpenedAt - b.lastOpenedAt || a.createdAt - b.createdAt);
    let count = lessons.length;
    let bytes = lessons.reduce((sum, lesson) => sum + lesson.bytes, 0);
    for (const lesson of lessons) {
      if (count <= MAX_LESSONS && bytes <= MAX_AUDIO_BYTES) break;
      // Even an oversized lesson remains replayable immediately after saving.
      if (lesson.id === record.id) continue;
      await requestResult(store.delete(lesson.id));
      count -= 1;
      bytes -= lesson.bytes;
    }
    return true;
  });
}

export async function listLessons(): Promise<SavedLessonSummary[]> {
  return withStore<SavedLessonSummary[]>("readonly", [], async (store) => {
    const records: unknown[] = await requestResult(store.getAll());
    return records.filter(isSavedLesson)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(({ version, id, topic, title, duration, createdAt, lastOpenedAt }) => ({
        version, id, topic, title, duration, createdAt, lastOpenedAt,
      }));
  });
}

export async function getLesson(id: string): Promise<SavedLesson | null> {
  return withStore<SavedLesson | null>("readwrite", null, async (store) => {
    const record: unknown = await requestResult(store.get(id));
    if (!isSavedLesson(record)) return null;
    record.lastOpenedAt = Date.now();
    await requestResult(store.put(record));
    return record;
  });
}

export async function deleteLesson(id: string): Promise<boolean> {
  return withStore("readwrite", false, async (store) => {
    await requestResult(store.delete(id));
    return true;
  });
}

export async function clearHistory(): Promise<boolean> {
  return withStore("readwrite", false, async (store) => {
    await requestResult(store.clear());
    return true;
  });
}
