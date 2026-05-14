import { describe, expect, it } from "vitest";
import { parseQuestionsFromText } from "../src/parser";

const source = {
  sourceId: "sample",
  sourceTitle: "Sample PDF",
};

describe("parseQuestionsFromText", () => {
  it("parses numbered PDF questions and star-marked correct answers", () => {
    const text = `
99.
Гірудотерапія — це метод лікування за допомогою медичних п’явок. Яке з нижченаведених захворювань є протипоказанням?
A. Анемія*
B. Тромбофлебіт
C. Бронхіт
D. Глаукома
Е. Гастрит

100.  Який симптом найхарактерніший для хронічного гастриту з підвищеною секреторною функцією шлунка?
A. Метеоризм
B. Печія*
C. Гикавка
D. Діарея
Е. Дисфагія
`;

    const result = parseQuestionsFromText(text, source);

    expect(result.warnings).toEqual([]);
    expect(result.questions).toHaveLength(2);
    expect(result.questions[0]).toMatchObject({
      number: 99,
      prompt:
        "Гірудотерапія — це метод лікування за допомогою медичних п’явок. Яке з нижченаведених захворювань є протипоказанням?",
      correctOptionId: "A",
    });
    expect(result.questions[0].options.map((option) => option.text)).toEqual([
      "Анемія",
      "Тромбофлебіт",
      "Бронхіт",
      "Глаукома",
      "Гастрит",
    ]);
    expect(result.questions[1].correctOptionId).toBe("B");
  });

  it("normalizes Cyrillic option labels and assigns expected labels to OCR-like option markers", () => {
    const text = `
132. Укажіть дозволений максимальний відсоток заповнення ємності.
А. 60%
В. 75%*
C. 50%
0. 55%
Е. 45%
`;

    const result = parseQuestionsFromText(text, source);

    expect(result.warnings).toEqual([]);
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].options.map((option) => option.id)).toEqual([
      "A",
      "B",
      "C",
      "D",
      "E",
    ]);
    expect(result.questions[0].options[3].text).toBe("55%");
    expect(result.questions[0].correctOptionId).toBe("B");
  });

  it("keeps wrapped question and option lines together", () => {
    const text = `
7.
Як називається процедура, що полягає у введенні розчинів лікарських засобів
через порожнину матки в маткові труби?
A. Гістероскопія
B. Пертубація
C. Лапароскопія
D. Гідротубація*
E. Кольпоскопія
`;

    const result = parseQuestionsFromText(text, source);

    expect(result.questions[0].prompt).toBe(
      "Як називається процедура, що полягає у введенні розчинів лікарських засобів через порожнину матки в маткові труби?",
    );
    expect(result.questions[0].correctOptionId).toBe("D");
  });

  it("accepts PDF.js option labels with spaces before the dot", () => {
    const text = `
2. Як називається графічне відображення результатів?
A . Міограма
B . Кардіограма
C . Спірограма
D . Токограма
Е . Партограма *
`;

    const result = parseQuestionsFromText(text, source);

    expect(result.warnings).toEqual([]);
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].options.map((option) => option.id)).toEqual([
      "A",
      "B",
      "C",
      "D",
      "E",
    ]);
    expect(result.questions[0].correctOptionId).toBe("E");
  });

  it("reports blocks that do not contain one correct answer", () => {
    const text = `
1. Broken question
A. One
B. Two
C. Three
D. Four
E. Five
`;

    const result = parseQuestionsFromText(text, source);

    expect(result.questions).toEqual([]);
    expect(result.warnings).toEqual([
      "Question 1 skipped: expected exactly one star-marked correct option, found 0.",
    ]);
  });
});
