import type { OptionId, QuizOption, QuizQuestion } from "./types";

export interface ParserSource {
  sourceId: string;
  sourceTitle: string;
}

export interface ParseResult {
  questions: QuizQuestion[];
  warnings: string[];
}

const OPTION_IDS: OptionId[] = ["A", "B", "C", "D", "E"];
const CYRILLIC_LABELS: Record<string, OptionId> = {
  "А": "A",
  "В": "B",
  "С": "C",
  "Е": "E",
};

interface OptionSlice {
  marker: string;
  text: string;
}

export function parseQuestionsFromText(text: string, source: ParserSource): ParseResult {
  const warnings: string[] = [];
  const normalized = normalizePdfText(text);
  const blocks = splitQuestionBlocks(normalized);
  const questions: QuizQuestion[] = [];

  for (const block of blocks) {
    const parsed = parseQuestionBlock(block, source);
    if (parsed.question) {
      questions.push(parsed.question);
    } else {
      warnings.push(parsed.warning);
    }
  }

  return { questions, warnings };
}

function normalizePdfText(text: string): string {
  return text
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitQuestionBlocks(text: string): string[] {
  const starts = [...text.matchAll(/(?:^|\n)\s*([1-9]\d{0,2})\.\s*/g)];
  const blocks: string[] = [];

  for (let index = 0; index < starts.length; index += 1) {
    const start = starts[index];
    const next = starts[index + 1];
    const startIndex = start.index ?? 0;
    const endIndex = next?.index ?? text.length;
    blocks.push(text.slice(startIndex, endIndex).trim());
  }

  return blocks;
}

function parseQuestionBlock(
  block: string,
  source: ParserSource,
): { question: QuizQuestion; warning: never } | { question: null; warning: string } {
  const header = block.match(/^\s*(\d{1,3})\.\s*/);
  if (!header) {
    return { question: null, warning: "Question block skipped: missing number." };
  }

  const number = Number(header[1]);
  const body = block.slice(header[0].length).trim();
  const optionSlices = splitOptionSlices(body);
  const prompt = collapseWhitespace(body.slice(0, optionSlices.firstOptionIndex));

  if (!prompt) {
    return { question: null, warning: `Question ${number} skipped: missing prompt.` };
  }

  if (optionSlices.options.length !== 5) {
    return {
      question: null,
      warning: `Question ${number} skipped: expected 5 options, found ${optionSlices.options.length}.`,
    };
  }

  const options: QuizOption[] = [];
  let correctOptionId: OptionId | null = null;
  let correctCount = 0;

  for (let index = 0; index < optionSlices.options.length; index += 1) {
    const slice = optionSlices.options[index];
    const optionId = normalizeOptionLabel(slice.marker, index);
    const isCorrect = /\*\s*$/.test(slice.text);
    const cleanedText = collapseWhitespace(slice.text.replace(/\*\s*$/, ""));

    if (!cleanedText) {
      return { question: null, warning: `Question ${number} skipped: option ${optionId} is empty.` };
    }

    if (isCorrect) {
      correctCount += 1;
      correctOptionId = optionId;
    }

    options.push({ id: optionId, text: cleanedText });
  }

  if (correctCount !== 1 || correctOptionId === null) {
    return {
      question: null,
      warning: `Question ${number} skipped: expected exactly one star-marked correct option, found ${correctCount}.`,
    };
  }

  return {
    question: {
      id: `${source.sourceId}-${number}`,
      sourceId: source.sourceId,
      sourceTitle: source.sourceTitle,
      number,
      prompt,
      options,
      correctOptionId,
    },
    warning: undefined as never,
  };
}

function splitOptionSlices(body: string): { firstOptionIndex: number; options: OptionSlice[] } {
  const optionPattern = /(?:^|\n)\s*([A-EАаВвСсЕе0])\s*\.\s*/g;
  const matches = [...body.matchAll(optionPattern)];

  if (matches.length === 0) {
    return { firstOptionIndex: body.length, options: [] };
  }

  const options: OptionSlice[] = [];

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const next = matches[index + 1];
    const start = match.index ?? 0;
    const textStart = start + match[0].length;
    const textEnd = next?.index ?? body.length;
    options.push({
      marker: match[1],
      text: body.slice(textStart, textEnd).trim(),
    });
  }

  return {
    firstOptionIndex: matches[0].index ?? body.length,
    options,
  };
}

function normalizeOptionLabel(marker: string, index: number): OptionId {
  if (marker === "0") {
    return "D";
  }

  const upper = marker.toUpperCase();
  if (upper in CYRILLIC_LABELS) {
    return CYRILLIC_LABELS[upper];
  }
  if (OPTION_IDS.includes(upper as OptionId)) {
    return upper as OptionId;
  }
  return OPTION_IDS[index] ?? "E";
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
