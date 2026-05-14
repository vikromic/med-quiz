import "./styles.css";
import { parsePdfFile, parsePdfFromUrl } from "./pdf";
import {
  answerCurrentQuestion,
  checkCurrentQuestion,
  createMistakesSession,
  createQuizSession,
  getSessionStats,
  moveToNextQuestion,
} from "./quiz";
import { clearSnapshot, loadSnapshot, saveSnapshot, type AppSettings, type AppView } from "./storage";
import type { OptionId, QuestionSet, QuizSession, QuizSessionItem } from "./types";

const SAMPLE_PDF_URL = "/sample-med-quiz.pdf";
const SAMPLE_TITLE = "ЗТЗ ЄДКІ Медсестринство 1-А (літо) 2023-2024";

interface AppState {
  questionSets: QuestionSet[];
  selectedSetIds: string[];
  session: QuizSession | null;
  settings: AppSettings;
  view: AppView;
}

const defaultState: AppState = {
  questionSets: [],
  selectedSetIds: [],
  session: null,
  settings: {
    shuffleQuestions: false,
    shuffleOptions: false,
  },
  view: "library",
};

const mountElement = document.querySelector<HTMLDivElement>("#app");
if (!mountElement) {
  throw new Error("Missing #app mount element.");
}
const app: HTMLDivElement = mountElement;

let state: AppState = { ...defaultState, ...loadSnapshot() };
let busyMessage = "";
let errorMessage = "";

render();
registerServiceWorker();

function render(): void {
  app.innerHTML = `
    <main class="app-shell">
      ${renderHeader()}
      ${renderNotice()}
      ${state.view === "library" ? renderLibrary() : ""}
      ${state.view === "quiz" ? renderQuiz() : ""}
      ${state.view === "result" ? renderResult() : ""}
    </main>
  `;

  bindHandlers();
}

function renderHeader(): string {
  return `
    <header class="topbar">
      <div>
        <p class="eyebrow">Med Quiz</p>
        <h1>ЄДКІ Trainer</h1>
      </div>
      <button class="ghost-button" id="clear-state" type="button">Clear</button>
    </header>
  `;
}

function renderNotice(): string {
  if (!busyMessage && !errorMessage) {
    return "";
  }

  return `
    <div class="${busyMessage ? "notice" : "notice notice-error"}" role="status">
      ${escapeHtml(busyMessage || errorMessage)}
    </div>
  `;
}

function renderLibrary(): string {
  const selectedCount = state.selectedSetIds.length;
  const totalSelectedQuestions = state.questionSets
    .filter((set) => state.selectedSetIds.includes(set.id))
    .reduce((sum, set) => sum + set.questions.length, 0);

  return `
    <section class="library-view" aria-label="Question library">
      <div class="action-row">
        <button class="primary-button" id="load-sample" type="button">Load Sample PDF</button>
        <label class="file-button">
          <input id="pdf-upload" type="file" accept="application/pdf,.pdf" multiple />
          Add PDF
        </label>
      </div>

      <div class="settings-row" aria-label="Quiz settings">
        <label class="toggle">
          <input id="shuffle-questions" type="checkbox" ${state.settings.shuffleQuestions ? "checked" : ""} />
          <span>Shuffle questions</span>
        </label>
        <label class="toggle">
          <input id="shuffle-options" type="checkbox" ${state.settings.shuffleOptions ? "checked" : ""} />
          <span>Shuffle answers</span>
        </label>
      </div>

      <section class="set-list" aria-label="Loaded PDFs">
        ${state.questionSets.length === 0 ? renderEmptyState() : state.questionSets.map(renderQuestionSetRow).join("")}
      </section>

      <footer class="start-bar">
        <div>
          <strong>${selectedCount}</strong> selected
          <span>${totalSelectedQuestions} questions</span>
        </div>
        <button class="primary-button" id="start-quiz" type="button" ${selectedCount === 0 ? "disabled" : ""}>
          ${selectedCount > 1 ? "Start Combined" : "Start Test"}
        </button>
      </footer>
    </section>
  `;
}

function renderEmptyState(): string {
  return `
    <div class="empty-state">
      <strong>No PDFs loaded</strong>
      <span>The bundled sample is ready to import.</span>
    </div>
  `;
}

function renderQuestionSetRow(set: QuestionSet): string {
  const checked = state.selectedSetIds.includes(set.id) ? "checked" : "";
  const warningText =
    set.warnings.length > 0 ? `<span class="warning-pill">${set.warnings.length} skipped</span>` : "";

  return `
    <article class="set-row">
      <label class="set-label">
        <input class="set-checkbox" type="checkbox" data-set-id="${escapeAttribute(set.id)}" ${checked} />
        <span>
          <strong>${escapeHtml(set.title)}</strong>
          <small>${set.questions.length} questions · ${escapeHtml(formatDate(set.importedAt))}</small>
        </span>
      </label>
      ${warningText}
    </article>
  `;
}

function renderQuiz(): string {
  const session = state.session;
  const item = session?.items[session.currentIndex];
  if (!session || !item) {
    return renderLibrary();
  }

  const stats = getSessionStats(session);
  const currentNumber = session.currentIndex + 1;
  const progress = stats.total === 0 ? 0 : Math.round((currentNumber / stats.total) * 100);

  return `
    <section class="quiz-view" aria-label="Quiz">
      <div class="quiz-status">
        <span>${currentNumber}/${stats.total}</span>
        <span>${stats.percentCorrect}% correct</span>
        <span>${stats.correct}/${stats.incorrect}</span>
      </div>
      <div class="progress-bar" aria-hidden="true">
        <span style="width: ${progress}%"></span>
      </div>

      <article class="question-panel">
        <div class="question-meta">
          <span>№${item.question.number}</span>
          <span>${escapeHtml(item.question.sourceTitle)}</span>
        </div>
        <h2>${escapeHtml(item.question.prompt)}</h2>
        <div class="option-list">
          ${item.question.options.map((option) => renderOptionButton(item, option.id, option.text)).join("")}
        </div>
      </article>

      <footer class="quiz-actions">
        <button class="ghost-button" id="back-library" type="button">Library</button>
        <button class="primary-button" id="quiz-primary" type="button" ${item.selectedOptionId === null ? "disabled" : ""}>
          ${item.isChecked ? (session.currentIndex === session.items.length - 1 ? "Finish" : "Next") : "Check"}
        </button>
      </footer>
    </section>
  `;
}

function renderOptionButton(item: QuizSessionItem, optionId: OptionId, text: string): string {
  const classes = ["option-button"];
  if (item.selectedOptionId === optionId) {
    classes.push("selected");
  }
  if (item.isChecked && optionId === item.question.correctOptionId) {
    classes.push("correct");
  }
  if (
    item.isChecked &&
    item.selectedOptionId === optionId &&
    item.selectedOptionId !== item.question.correctOptionId
  ) {
    classes.push("incorrect");
  }

  return `
    <button class="${classes.join(" ")}" type="button" data-option-id="${optionId}" ${item.isChecked ? "disabled" : ""}>
      <span class="option-id">${optionId}</span>
      <span>${escapeHtml(text)}</span>
    </button>
  `;
}

function renderResult(): string {
  const session = state.session;
  if (!session) {
    return renderLibrary();
  }

  const stats = getSessionStats(session);
  const mistakeCount = session.items.filter((item) => item.isCorrect === false).length;

  return `
    <section class="result-view" aria-label="Results">
      <div class="result-score">
        <span>${stats.percentCorrect}%</span>
        <strong>${stats.correct} correct · ${stats.incorrect} mistakes</strong>
      </div>
      <div class="result-actions">
        <button class="primary-button" id="retry-test" type="button">Retry Test</button>
        <button class="secondary-button" id="review-mistakes" type="button" ${mistakeCount === 0 ? "disabled" : ""}>
          Review Mistakes Only
        </button>
        <button class="ghost-button" id="result-library" type="button">Library</button>
      </div>
    </section>
  `;
}

function bindHandlers(): void {
  document.querySelector<HTMLButtonElement>("#clear-state")?.addEventListener("click", clearAll);
  document.querySelector<HTMLButtonElement>("#load-sample")?.addEventListener("click", loadSample);
  document.querySelector<HTMLInputElement>("#pdf-upload")?.addEventListener("change", importFiles);
  document.querySelector<HTMLButtonElement>("#start-quiz")?.addEventListener("click", startQuiz);
  document.querySelector<HTMLInputElement>("#shuffle-questions")?.addEventListener("change", updateSettings);
  document.querySelector<HTMLInputElement>("#shuffle-options")?.addEventListener("change", updateSettings);
  document.querySelector<HTMLButtonElement>("#quiz-primary")?.addEventListener("click", handleQuizPrimary);
  document.querySelector<HTMLButtonElement>("#back-library")?.addEventListener("click", showLibrary);
  document.querySelector<HTMLButtonElement>("#retry-test")?.addEventListener("click", retryTest);
  document.querySelector<HTMLButtonElement>("#review-mistakes")?.addEventListener("click", reviewMistakes);
  document.querySelector<HTMLButtonElement>("#result-library")?.addEventListener("click", showLibrary);

  document.querySelectorAll<HTMLInputElement>(".set-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", updateSelectedSets);
  });

  document.querySelectorAll<HTMLButtonElement>(".option-button").forEach((button) => {
    button.addEventListener("click", () => {
      const optionId = button.dataset.optionId as OptionId | undefined;
      if (optionId) {
        answerQuestion(optionId);
      }
    });
  });
}

async function loadSample(): Promise<void> {
  busyMessage = "Loading sample PDF...";
  errorMessage = "";
  render();

  try {
    const questionSet = await parsePdfFromUrl(SAMPLE_PDF_URL, SAMPLE_TITLE);
    addQuestionSet(questionSet);
  } catch (error) {
    setError(error instanceof Error ? error.message : "Sample PDF could not be loaded.");
  } finally {
    busyMessage = "";
    render();
  }
}

async function importFiles(event: Event): Promise<void> {
  const input = event.currentTarget as HTMLInputElement;
  const files = [...(input.files ?? [])].filter((file) => file.name.toLowerCase().endsWith(".pdf"));
  if (files.length === 0) {
    return;
  }

  errorMessage = "";
  for (let index = 0; index < files.length; index += 1) {
    busyMessage = `Importing ${index + 1}/${files.length}...`;
    render();

    try {
      addQuestionSet(await parsePdfFile(files[index]));
    } catch (error) {
      setError(error instanceof Error ? error.message : `${files[index].name} could not be imported.`);
    }
  }

  busyMessage = "";
  input.value = "";
  render();
}

function addQuestionSet(questionSet: QuestionSet): void {
  if (questionSet.questions.length === 0) {
    setError(`${questionSet.fileName} did not contain parseable questions.`);
    return;
  }

  const existing = state.questionSets.find((set) => set.fileName === questionSet.fileName);
  const questionSets = existing
    ? state.questionSets.map((set) => (set.fileName === questionSet.fileName ? questionSet : set))
    : [...state.questionSets, questionSet];
  const selectedSetIds = state.selectedSetIds.filter((id) => id !== existing?.id);

  state = {
    ...state,
    questionSets,
    selectedSetIds: [...new Set([...selectedSetIds, questionSet.id])],
    view: "library",
  };
  persist();
}

function startQuiz(): void {
  const selectedSets = state.questionSets.filter((set) => state.selectedSetIds.includes(set.id));
  const questions = selectedSets.flatMap((set) => set.questions);
  if (questions.length === 0) {
    setError("No questions selected.");
    return;
  }

  state = {
    ...state,
    session: createQuizSession(questions, {
      title: selectedSets.length > 1 ? `Combined (${selectedSets.length})` : selectedSets[0].title,
      sourceSetIds: selectedSets.map((set) => set.id),
      shuffleQuestions: state.settings.shuffleQuestions,
      shuffleOptions: state.settings.shuffleOptions,
      mode: selectedSets.length > 1 ? "combined" : "standard",
    }),
    view: "quiz",
  };
  errorMessage = "";
  persist();
  render();
}

function answerQuestion(optionId: OptionId): void {
  if (!state.session) {
    return;
  }

  state = {
    ...state,
    session: answerCurrentQuestion(state.session, optionId),
  };
  persist();
  render();
}

function handleQuizPrimary(): void {
  const session = state.session;
  if (!session) {
    return;
  }

  const item = session.items[session.currentIndex];
  if (!item) {
    return;
  }

  if (!item.isChecked) {
    state = { ...state, session: checkCurrentQuestion(session) };
  } else if (session.currentIndex === session.items.length - 1) {
    state = { ...state, view: "result" };
  } else {
    state = { ...state, session: moveToNextQuestion(session) };
  }

  persist();
  render();
}

function retryTest(): void {
  const session = state.session;
  if (!session) {
    return;
  }

  state = {
    ...state,
    session: createQuizSession(
      session.items.map((item) => item.question),
      {
        title: session.title,
        sourceSetIds: session.sourceSetIds,
        shuffleQuestions: session.shuffleQuestions,
        shuffleOptions: session.shuffleOptions,
        mode: session.mode === "mistakes" ? "mistakes" : session.sourceSetIds.length > 1 ? "combined" : "standard",
      },
    ),
    view: "quiz",
  };
  persist();
  render();
}

function reviewMistakes(): void {
  if (!state.session) {
    return;
  }

  const mistakeSession = createMistakesSession(state.session);
  if (mistakeSession.items.length === 0) {
    return;
  }

  state = {
    ...state,
    session: mistakeSession,
    view: "quiz",
  };
  persist();
  render();
}

function updateSelectedSets(): void {
  const selectedSetIds = [...document.querySelectorAll<HTMLInputElement>(".set-checkbox")]
    .filter((checkbox) => checkbox.checked)
    .map((checkbox) => checkbox.dataset.setId)
    .filter((id): id is string => Boolean(id));

  state = { ...state, selectedSetIds };
  persist();
  render();
}

function updateSettings(): void {
  state = {
    ...state,
    settings: {
      shuffleQuestions: Boolean(document.querySelector<HTMLInputElement>("#shuffle-questions")?.checked),
      shuffleOptions: Boolean(document.querySelector<HTMLInputElement>("#shuffle-options")?.checked),
    },
  };
  persist();
}

function showLibrary(): void {
  state = { ...state, view: "library" };
  persist();
  render();
}

function clearAll(): void {
  clearSnapshot();
  state = { ...defaultState };
  busyMessage = "";
  errorMessage = "";
  render();
}

function setError(message: string): void {
  errorMessage = message;
  persist();
}

function persist(): void {
  try {
    saveSnapshot({
      questionSets: state.questionSets,
      selectedSetIds: state.selectedSetIds,
      session: state.session,
      settings: state.settings,
      view: state.view,
    });
  } catch {
    errorMessage = "Progress could not be saved in this browser.";
  }
}

function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  if (import.meta.env.DEV) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        registration.unregister();
      });
    });
    return;
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    });
  }
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("uk", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[char];
  });
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/`/g, "&#096;");
}
