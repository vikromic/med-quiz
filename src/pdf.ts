import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.mjs?url";
import { installBrowserCompatibilityPolyfills } from "./browserCompatibility";
import { parseQuestionsFromText } from "./parser";
import { textItemsToPageText, type PositionedTextItem } from "./pdfText";
import type { QuestionSet } from "./types";

type PdfJsModule = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

let pdfjsPromise: Promise<PdfJsModule> | null = null;

export async function parsePdfFile(file: File): Promise<QuestionSet> {
  const sourceId = createSourceId(file.name);
  const text = await extractTextFromPdf(await file.arrayBuffer());
  const result = parseQuestionsFromText(text, {
    sourceId,
    sourceTitle: file.name,
  });

  return {
    id: sourceId,
    title: file.name.replace(/\.pdf$/i, ""),
    fileName: file.name,
    importedAt: new Date().toISOString(),
    questions: result.questions,
    warnings: result.warnings,
  };
}

export async function parsePdfFromUrl(url: string, title: string): Promise<QuestionSet> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load PDF: ${response.status} ${response.statusText}`);
  }

  const fileName = title.endsWith(".pdf") ? title : `${title}.pdf`;
  const file = new File([await response.blob()], fileName, { type: "application/pdf" });
  return parsePdfFile(file);
}

export async function extractTextFromPdf(data: ArrayBuffer): Promise<string> {
  const pdfjs = await loadPdfJs();
  const document = await pdfjs.getDocument({
    data,
    verbosity: pdfjs.VerbosityLevel.ERRORS,
  }).promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const textItems = content.items.reduce<PositionedTextItem[]>((items, item) => {
      if (isPositionedTextItem(item)) {
        items.push({ str: item.str, transform: item.transform });
      }
      return items;
    }, []);
    pages.push(textItemsToPageText(textItems));
    page.cleanup();
  }

  await document.destroy();
  return pages.join("\n\n");
}

async function loadPdfJs(): Promise<PdfJsModule> {
  installBrowserCompatibilityPolyfills();
  pdfjsPromise ??= import("pdfjs-dist/legacy/build/pdf.mjs").then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
    return pdfjs;
  });
  return pdfjsPromise;
}

function isPositionedTextItem(item: unknown): item is PositionedTextItem {
  if (typeof item !== "object" || item === null) {
    return false;
  }

  const candidate = item as Partial<PositionedTextItem>;
  return typeof candidate.str === "string" && Array.isArray(candidate.transform);
}

function createSourceId(fileName: string): string {
  const slug = fileName
    .replace(/\.pdf$/i, "")
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return `${slug || "pdf"}-${Date.now().toString(36)}`;
}
