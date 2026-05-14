import { describe, expect, it } from "vitest";
import { clearSnapshot, loadSnapshot, saveSnapshot } from "../src/storage";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe("storage", () => {
  it("saves and loads an app snapshot", () => {
    const storage = new MemoryStorage();
    const snapshot = {
      questionSets: [],
      selectedSetIds: ["sample"],
      session: null,
      settings: {
        shuffleQuestions: true,
        shuffleOptions: false,
      },
      view: "library" as const,
    };

    saveSnapshot(snapshot, storage);

    expect(loadSnapshot(storage)).toEqual(snapshot);
  });

  it("clears corrupted snapshots instead of throwing", () => {
    const storage = new MemoryStorage();
    storage.setItem("med-quiz-state-v1", "{bad json");

    expect(loadSnapshot(storage)).toBeNull();
    expect(storage.getItem("med-quiz-state-v1")).toBeNull();
  });

  it("removes saved state", () => {
    const storage = new MemoryStorage();
    saveSnapshot(
      {
        questionSets: [],
        selectedSetIds: [],
        session: null,
        settings: {
          shuffleQuestions: false,
          shuffleOptions: false,
        },
        view: "library",
      },
      storage,
    );

    clearSnapshot(storage);

    expect(loadSnapshot(storage)).toBeNull();
  });
});
