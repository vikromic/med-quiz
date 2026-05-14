import type { OptionId, QuizQuestion, QuizSession, QuizSessionItem, QuizStats } from "./types";

interface CreateSessionOptions {
  title?: string;
  sourceSetIds?: string[];
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  mode?: QuizSession["mode"];
  rng?: () => number;
}

export function createQuizSession(
  questions: QuizQuestion[],
  options: CreateSessionOptions,
): QuizSession {
  const rng = options.rng ?? Math.random;
  const orderedQuestions = options.shuffleQuestions ? shuffleArray(questions, rng) : [...questions];
  const items = orderedQuestions.map<QuizSessionItem>((question) => ({
    question: options.shuffleOptions
      ? { ...question, options: shuffleArray(question.options, rng) }
      : { ...question, options: [...question.options] },
    selectedOptionId: null,
    isChecked: false,
    isCorrect: null,
  }));

  return {
    id: cryptoRandomId(),
    title: options.title ?? "Quiz",
    createdAt: new Date().toISOString(),
    sourceSetIds: options.sourceSetIds ?? [],
    currentIndex: 0,
    items,
    shuffleQuestions: options.shuffleQuestions,
    shuffleOptions: options.shuffleOptions,
    mode: options.mode ?? "standard",
  };
}

export function getCurrentQuestion(session: QuizSession): QuizQuestion | null {
  return session.items[session.currentIndex]?.question ?? null;
}

export function answerCurrentQuestion(session: QuizSession, optionId: OptionId): QuizSession {
  const item = session.items[session.currentIndex];
  if (!item || item.isChecked) {
    return session;
  }

  return updateCurrentItem(session, {
    ...item,
    selectedOptionId: optionId,
  });
}

export function checkCurrentQuestion(session: QuizSession): QuizSession {
  const item = session.items[session.currentIndex];
  if (!item || item.selectedOptionId === null) {
    return session;
  }

  const isCorrect = item.selectedOptionId === item.question.correctOptionId;
  return updateCurrentItem(session, {
    ...item,
    isChecked: true,
    isCorrect,
  });
}

export function moveToNextQuestion(session: QuizSession): QuizSession {
  if (session.currentIndex >= session.items.length - 1) {
    return session;
  }
  return {
    ...session,
    currentIndex: session.currentIndex + 1,
  };
}

export function getSessionStats(session: QuizSession): QuizStats {
  const answered = session.items.filter((item) => item.isChecked).length;
  const correct = session.items.filter((item) => item.isCorrect === true).length;
  const incorrect = session.items.filter((item) => item.isCorrect === false).length;

  return {
    total: session.items.length,
    answered,
    correct,
    incorrect,
    percentCorrect: answered === 0 ? 0 : Math.round((correct / answered) * 100),
    isComplete: session.items.length > 0 && answered === session.items.length,
  };
}

export function createMistakesSession(session: QuizSession): QuizSession {
  const missedQuestions = session.items
    .filter((item) => item.isCorrect === false)
    .map((item) => item.question);

  return createQuizSession(missedQuestions, {
    title: "Mistakes Review",
    sourceSetIds: session.sourceSetIds,
    shuffleQuestions: false,
    shuffleOptions: false,
    mode: "mistakes",
  });
}

function updateCurrentItem(session: QuizSession, item: QuizSessionItem): QuizSession {
  return {
    ...session,
    items: session.items.map((existing, index) => (index === session.currentIndex ? item : existing)),
  };
}

function shuffleArray<T>(items: T[], rng: () => number): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function cryptoRandomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `quiz-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
