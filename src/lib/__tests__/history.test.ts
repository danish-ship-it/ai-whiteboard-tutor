import { IDBFactory, IDBObjectStore } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SavedLesson } from "../storage/history";
import { pythagoras, steadyAlignment } from "./fixtures";

let history: typeof import("../storage/history");
let factory: IDBFactory;
let warn: ReturnType<typeof vi.spyOn>;

function lesson(overrides: Partial<SavedLesson> = {}): SavedLesson {
  return {
    version: 1,
    id: crypto.randomUUID(),
    topic: "Right triangles",
    title: pythagoras.title,
    lesson: pythagoras,
    token: "saved-token",
    tokenExpiresAt: 10_000,
    audio: null,
    mimeType: null,
    alignment: null,
    normalizedAlignment: null,
    duration: 12,
    createdAt: 100,
    lastOpenedAt: 100,
    ...overrides,
  };
}

function result<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function completed(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error);
    transaction.onerror = () => reject(transaction.error);
  });
}

beforeEach(async () => {
  vi.resetModules();
  factory = new IDBFactory();
  vi.stubGlobal("indexedDB", factory);
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  history = await import("../storage/history");
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("lesson history", () => {
  it("round-trips audio, lesson, token and alignments, and persists opening time", async () => {
    const saved = lesson({
      audio: new Blob([new Uint8Array([0, 1, 128, 255])], { type: "audio/mpeg" }),
      mimeType: "audio/mpeg",
      alignment: steadyAlignment("3 sides"),
      normalizedAlignment: steadyAlignment("three sides"),
    });
    expect(await history.saveLesson(saved)).toBe(true);
    vi.spyOn(Date, "now").mockReturnValue(500);

    const restored = await history.getLesson(saved.id);
    expect(restored).toEqual({ ...saved, lastOpenedAt: 500 });
    expect(restored?.audio).toBeInstanceOf(Blob);
    expect(restored?.audio?.type).toBe("audio/mpeg");
    expect(await restored?.audio?.arrayBuffer()).toEqual(await saved.audio!.arrayBuffer());
    expect(await history.listLessons()).toEqual([
      expect.objectContaining({ id: saved.id, lastOpenedAt: 500 }),
    ]);
    expect(saved.lastOpenedAt).toBe(100);
  });

  it("lists lightweight summaries by creation time, newest first", async () => {
    for (const createdAt of [20, 30, 10]) {
      await history.saveLesson(lesson({
        id: String(createdAt), createdAt, lastOpenedAt: 100 - createdAt,
        audio: new Blob(["audio"]),
      }));
    }
    const summaries = await history.listLessons();
    expect(summaries.map(({ id }) => id)).toEqual(["30", "20", "10"]);
    expect(summaries[0]).toEqual({
      version: 1, id: "30", topic: "Right triangles", title: pythagoras.title,
      duration: 12, createdAt: 30, lastOpenedAt: 70,
    });
  });

  it("updates an existing stable id and retains nullable replay fields", async () => {
    const saved = lesson();
    await history.saveLesson(saved);
    expect(await history.saveLesson({ ...saved, title: "Updated title" })).toBe(true);
    expect(await history.listLessons()).toHaveLength(1);
    expect(await history.getLesson(saved.id)).toMatchObject({
      id: saved.id, title: "Updated title", audio: null, mimeType: null,
      alignment: null, normalizedAlignment: null,
    });
  });

  it("evicts the least recently opened above ten, protecting the just-saved lesson", async () => {
    for (let index = 0; index < 10; index++) {
      await history.saveLesson(lesson({
        id: String(index), createdAt: index, lastOpenedAt: index + 1,
      }));
    }
    vi.spyOn(Date, "now").mockReturnValue(1_000);
    await history.getLesson("0");
    expect(await history.saveLesson(lesson({ id: "new", lastOpenedAt: 0 }))).toBe(true);

    const summaries = await history.listLessons();
    expect(summaries).toHaveLength(10);
    expect(summaries.map(({ id }) => id)).toEqual(expect.arrayContaining(["0", "new"]));
    expect(await history.getLesson("1")).toBeNull();
  });

  it("applies count retention when saves overlap", async () => {
    const saved = await Promise.all(Array.from({ length: 12 }, (_, index) =>
      history.saveLesson(lesson({ id: String(index), lastOpenedAt: index })),
    ));
    expect(saved.every(Boolean)).toBe(true);
    expect(await history.listLessons()).toHaveLength(10);
    expect(await history.getLesson("0")).toBeNull();
    expect(await history.getLesson("1")).toBeNull();
  });

  it("evicts by audio bytes and recency above 30 MiB", async () => {
    const audio = new Blob([new Uint8Array(10 * 1024 * 1024)]);
    for (const [id, lastOpenedAt] of [["recent", 30], ["cold", 10], ["warm", 20]] as const) {
      await history.saveLesson(lesson({ id, audio, lastOpenedAt }));
    }
    expect(await history.listLessons()).toHaveLength(3);
    expect(await history.saveLesson(lesson({ id: "new", audio, lastOpenedAt: 0 }))).toBe(true);
    expect((await history.listLessons()).map(({ id }) => id).sort()).toEqual(["new", "recent", "warm"]);
  });

  it("keeps a newly saved Blob larger than the audio budget", async () => {
    await history.saveLesson(lesson({ id: "old" }));
    const audio = new Blob([new Uint8Array(31 * 1024 * 1024)]);
    expect(await history.saveLesson(lesson({ id: "large", audio, lastOpenedAt: 0 }))).toBe(true);
    expect((await history.listLessons()).map(({ id }) => id)).toEqual(["large"]);
    expect((await history.getLesson("large"))?.audio?.size).toBe(audio.size);
  });

  it("ignores unknown versions without rewriting them on get", async () => {
    await history.saveLesson(lesson({ id: "known" }));
    const database = await result(factory.open("chalk"));
    try {
      const future = { ...lesson({ id: "future" }), version: 2 };
      const transaction = database.transaction("lessons", "readwrite");
      const done = completed(transaction);
      transaction.objectStore("lessons").put(future);
      await done;

      expect((await history.listLessons()).map(({ id }) => id)).toEqual(["known"]);
      expect(await history.getLesson("future")).toBeNull();
      expect(await result(database.transaction("lessons").objectStore("lessons").get("future"))).toEqual(future);
    } finally {
      database.close();
    }
  });

  it("deletes individual lessons and clears history", async () => {
    await history.saveLesson(lesson({ id: "first" }));
    await history.saveLesson(lesson({ id: "second" }));
    expect(await history.getLesson("missing")).toBeNull();
    expect(await history.deleteLesson("first")).toBe(true);
    expect(await history.getLesson("first")).toBeNull();
    expect((await history.listLessons()).map(({ id }) => id)).toEqual(["second"]);
    expect(await history.clearHistory()).toBe(true);
    expect(await history.listLessons()).toEqual([]);
  });

  it("includes unknown versions in the retention count", async () => {
    await history.isHistoryAvailable();
    const database = await result(factory.open("chalk"));
    try {
      const transaction = database.transaction("lessons", "readwrite");
      const done = completed(transaction);
      for (let index = 0; index < 10; index++) {
        transaction.objectStore("lessons").put({
          ...lesson({ id: `future-${index}`, lastOpenedAt: index + 1 }), version: 2,
        });
      }
      await done;

      expect(await history.saveLesson(lesson({ id: "new", lastOpenedAt: 0 }))).toBe(true);
      const records: { id: string }[] = await result(database.transaction("lessons").objectStore("lessons").getAll());
      expect(records).toHaveLength(10);
      expect(records.map(({ id }) => id)).not.toContain("future-0");
      expect((await history.listLessons()).map(({ id }) => id)).toEqual(["new"]);
    } finally {
      database.close();
    }
  });

  it("opens lazily, shares the connection, and closes it on versionchange", async () => {
    const open = vi.spyOn(factory, "open");
    expect(open).not.toHaveBeenCalled();
    expect(await Promise.all([history.isHistoryAvailable(), history.isHistoryAvailable()])).toEqual([true, true]);
    await history.listLessons();
    expect(open).toHaveBeenCalledTimes(1);

    await result(factory.deleteDatabase("chalk"));
    expect(await history.isHistoryAvailable()).toBe(true);
    expect(open).toHaveBeenCalledTimes(2);
  });

  it("returns safe defaults and warns only once when indexedDB is unavailable", async () => {
    vi.stubGlobal("indexedDB", undefined);
    expect(await history.isHistoryAvailable()).toBe(false);
    expect(await history.saveLesson(lesson())).toBe(false);
    expect(await history.listLessons()).toEqual([]);
    expect(await history.getLesson("missing")).toBeNull();
    expect(await history.deleteLesson("missing")).toBe(false);
    expect(await history.clearHistory()).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("recovers after a synchronous open failure", async () => {
    const open = vi.spyOn(factory, "open").mockImplementationOnce(() => {
      throw new DOMException("Storage denied", "SecurityError");
    });
    expect(await history.isHistoryAvailable()).toBe(false);
    expect(await history.isHistoryAvailable()).toBe(true);
    expect(open).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("handles asynchronous open errors", async () => {
    const database = await result(factory.open("chalk", 2));
    database.close();
    expect(await history.isHistoryAvailable()).toBe(false);
    expect(await history.listLessons()).toEqual([]);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("preserves previous history on quota errors", async () => {
    await history.saveLesson(lesson({ id: "original" }));
    vi.spyOn(IDBObjectStore.prototype, "put").mockImplementationOnce(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });
    expect(await history.saveLesson(lesson({ id: "failed" }))).toBe(false);
    expect((await history.listLessons()).map(({ id }) => id)).toEqual(["original"]);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("reports failure when a successful write request is followed by an abort", async () => {
    await history.saveLesson(lesson({ id: "original" }));
    const put = IDBObjectStore.prototype.put;
    vi.spyOn(IDBObjectStore.prototype, "put").mockImplementationOnce(function (this: IDBObjectStore, ...args) {
      const request = put.apply(this, args);
      request.addEventListener("success", () => this.transaction.abort());
      return request;
    });
    expect(await history.saveLesson(lesson({ id: "aborted" }))).toBe(false);
    expect((await history.listLessons()).map(({ id }) => id)).toEqual(["original"]);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("saves pictures and clips with a saved lesson, and ignores lessons that aren't saved", async () => {
    const saved = lesson();
    await history.saveLesson(saved);
    const visuals = { s1: { image: "https://cdn.example/s1.png", video: "https://cdn.example/s1.mp4" }, s2: { image: "https://cdn.example/s2.png" } };
    await expect(history.saveVisuals(saved.id, visuals)).resolves.toBe(true);
    expect((await history.getLesson(saved.id))?.visuals).toEqual(visuals);
    await expect(history.saveVisuals("missing", visuals)).resolves.toBe(false);
    expect(await history.listLessons()).toHaveLength(1);
  });
});
