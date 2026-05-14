export interface PositionedTextItem {
  str: string;
  transform: number[];
}

interface TextLine {
  y: number;
  items: PositionedTextItem[];
}

export function textItemsToPageText(items: PositionedTextItem[]): string {
  const lines: TextLine[] = [];
  const yTolerance = 4;

  for (const item of items) {
    const text = item.str.trim();
    if (!text) {
      continue;
    }

    const y = item.transform[5] ?? 0;
    const line = lines.find((candidate) => Math.abs(candidate.y - y) <= yTolerance);
    if (line) {
      line.items.push({ ...item, str: text });
    } else {
      lines.push({ y, items: [{ ...item, str: text }] });
    }
  }

  return lines
    .sort((first, second) => second.y - first.y)
    .map((line) =>
      line.items
        .sort((first, second) => (first.transform[4] ?? 0) - (second.transform[4] ?? 0))
        .map((item) => item.str)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean)
    .join("\n");
}
