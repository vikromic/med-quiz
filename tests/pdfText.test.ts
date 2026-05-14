import { describe, expect, it } from "vitest";
import { textItemsToPageText } from "../src/pdfText";

describe("textItemsToPageText", () => {
  it("sorts PDF text items into readable lines by position", () => {
    const text = textItemsToPageText([
      { str: "варіант", transform: [1, 0, 0, 1, 90, 700] },
      { str: "1.", transform: [1, 0, 0, 1, 30, 700] },
      { str: "A.", transform: [1, 0, 0, 1, 30, 680] },
      { str: "Нітрофурани*", transform: [1, 0, 0, 1, 58, 680] },
      { str: "B.", transform: [1, 0, 0, 1, 30, 660] },
      { str: "Антациди", transform: [1, 0, 0, 1, 58, 660] },
    ]);

    expect(text).toBe("1. варіант\nA. Нітрофурани*\nB. Антациди");
  });
});
