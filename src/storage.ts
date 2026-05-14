import type { QuestionSet, QuizSession } from "./types";

export const STORAGE_KEY = "med-quiz-state-v1";

export interface AppSettings {
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
}

export type AppView = "library" | "quiz" | "result";

export interface AppSnapshot {
  questionSets: QuestionSet[];
  selectedSetIds: string[];
  session: QuizSession | null;
  settings: AppSettings;
  view: AppView;
}

export function loadSnapshot(storage: Storage = localStorage): AppSnapshot | null {
  const serialized = storage.getItem(STORAGE_KEY);
  if (!serialized) {
    return null;
  }

  try {
    return JSON.parse(serialized) as AppSnapshot;
  } catch {
    storage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function saveSnapshot(snapshot: AppSnapshot, storage: Storage = localStorage): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

export function clearSnapshot(storage: Storage = localStorage): void {
  storage.removeItem(STORAGE_KEY);
}
