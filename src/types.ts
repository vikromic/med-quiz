export type OptionId = "A" | "B" | "C" | "D" | "E";

export interface QuizOption {
  id: OptionId;
  text: string;
}

export interface QuizQuestion {
  id: string;
  sourceId: string;
  sourceTitle: string;
  number: number;
  prompt: string;
  options: QuizOption[];
  correctOptionId: OptionId;
}

export interface QuestionSet {
  id: string;
  title: string;
  fileName: string;
  importedAt: string;
  questions: QuizQuestion[];
  warnings: string[];
}

export interface QuizSessionItem {
  question: QuizQuestion;
  selectedOptionId: OptionId | null;
  isChecked: boolean;
  isCorrect: boolean | null;
}

export interface QuizSession {
  id: string;
  title: string;
  createdAt: string;
  sourceSetIds: string[];
  currentIndex: number;
  items: QuizSessionItem[];
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  mode: "standard" | "combined" | "mistakes";
}

export interface QuizStats {
  total: number;
  answered: number;
  correct: number;
  incorrect: number;
  percentCorrect: number;
  isComplete: boolean;
}
