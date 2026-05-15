import { describe, expect, it } from "vitest";
import {
  answerCurrentQuestion,
  checkCurrentQuestion,
  createMistakesSession,
  createQuizSession,
  getCurrentQuestion,
  getSessionStats,
  moveToNextQuestion,
} from "../src/quiz";
import type { OptionId, QuizQuestion, QuizSession } from "../src/types";

const questions: QuizQuestion[] = [
  {
    id: "sample-1",
    sourceId: "sample",
    sourceTitle: "Sample",
    number: 1,
    prompt: "First question?",
    correctOptionId: "B",
    options: [
      { id: "A", text: "One" },
      { id: "B", text: "Two" },
    ],
  },
  {
    id: "sample-2",
    sourceId: "sample",
    sourceTitle: "Sample",
    number: 2,
    prompt: "Second question?",
    correctOptionId: "A",
    options: [
      { id: "A", text: "Alpha" },
      { id: "B", text: "Beta" },
    ],
  },
];

describe("quiz session", () => {
  it("checks answers, tracks progress, and advances through questions", () => {
    let session = createQuizSession(questions, {
      shuffleQuestions: false,
      shuffleOptions: false,
    });

    expect(getCurrentQuestion(session)?.id).toBe("sample-1");
    session = answerCurrentQuestion(session, "A");
    session = checkCurrentQuestion(session);

    expect(session.items[0]).toMatchObject({
      selectedOptionId: "A",
      isChecked: true,
      isCorrect: false,
    });
    expect(getSessionStats(session)).toMatchObject({
      total: 2,
      answered: 1,
      correct: 0,
      incorrect: 1,
      percentCorrect: 0,
      isComplete: false,
    });

    session = moveToNextQuestion(session);
    expect(getCurrentQuestion(session)?.id).toBe("sample-2");
    session = answerCurrentQuestion(session, "A");
    session = checkCurrentQuestion(session);

    expect(getSessionStats(session)).toMatchObject({
      answered: 2,
      correct: 1,
      incorrect: 1,
      percentCorrect: 50,
      isComplete: true,
    });
  });

  it("builds a review session from only missed questions", () => {
    let session = createQuizSession(questions, {
      shuffleQuestions: false,
      shuffleOptions: false,
    });
    session = checkCurrentQuestion(answerCurrentQuestion(session, "A"));
    session = moveToNextQuestion(session);
    session = checkCurrentQuestion(answerCurrentQuestion(session, "A"));

    const mistakes = createMistakesSession(session);

    expect(mistakes.items).toHaveLength(1);
    expect(mistakes.items[0].question.id).toBe("sample-1");
    expect(mistakes.currentIndex).toBe(0);
    expect(getSessionStats(mistakes)).toMatchObject({
      total: 1,
      answered: 0,
      correct: 0,
      incorrect: 0,
    });
  });

  it("creates repeatable mistakes-only sessions with independent stats", () => {
    const reviewQuestions: QuizQuestion[] = [
      ...questions,
      {
        id: "sample-3",
        sourceId: "sample",
        sourceTitle: "Sample",
        number: 3,
        prompt: "Third question?",
        correctOptionId: "B",
        options: [
          { id: "A", text: "Left" },
          { id: "B", text: "Right" },
        ],
      },
    ];

    let session = createQuizSession(reviewQuestions, {
      shuffleQuestions: false,
      shuffleOptions: false,
    });
    session = answerAndCheck(session, "A");
    session = moveToNextQuestion(session);
    session = answerAndCheck(session, "A");
    session = moveToNextQuestion(session);
    session = answerAndCheck(session, "A");

    const firstReview = createMistakesSession(session);

    expect(firstReview).toMatchObject({
      title: "Mistakes Review",
      currentIndex: 0,
      mode: "mistakes",
    });
    expect(firstReview.items.map((item) => item.question.id)).toEqual([
      "sample-1",
      "sample-3",
    ]);
    expect(getSessionStats(firstReview)).toMatchObject({
      total: 2,
      answered: 0,
      correct: 0,
      incorrect: 0,
      percentCorrect: 0,
    });

    let repeatedReview = answerAndCheck(firstReview, "A");
    repeatedReview = moveToNextQuestion(repeatedReview);
    repeatedReview = answerAndCheck(repeatedReview, "B");

    expect(getSessionStats(repeatedReview)).toMatchObject({
      total: 2,
      answered: 2,
      correct: 1,
      incorrect: 1,
      percentCorrect: 50,
    });

    const finalReview = createMistakesSession(repeatedReview);

    expect(finalReview.items.map((item) => item.question.id)).toEqual([
      "sample-1",
    ]);
    expect(getSessionStats(finalReview)).toMatchObject({
      total: 1,
      answered: 0,
      correct: 0,
      incorrect: 0,
      percentCorrect: 0,
    });

    const correctedFinalReview = answerAndCheck(finalReview, "B");
    const resolvedReview = createMistakesSession(correctedFinalReview);

    expect(getSessionStats(correctedFinalReview)).toMatchObject({
      total: 1,
      answered: 1,
      correct: 1,
      incorrect: 0,
      percentCorrect: 100,
    });
    expect(resolvedReview.items).toEqual([]);
  });

  it("uses a deterministic random source when shuffling", () => {
    const randomValues = [0.1, 0.1, 0.9];
    const rng = () => {
      return randomValues.shift() ?? 0.9;
    };

    const session = createQuizSession(questions, {
      shuffleQuestions: true,
      shuffleOptions: true,
      rng,
    });

    expect(session.items.map((item) => item.question.id)).toEqual([
      "sample-2",
      "sample-1",
    ]);
    expect(session.items[0].question.options.map((option) => option.id)).toEqual([
      "B",
      "A",
    ]);
  });
});

function answerAndCheck(session: QuizSession, optionId: OptionId): QuizSession {
  return checkCurrentQuestion(answerCurrentQuestion(session, optionId));
}
