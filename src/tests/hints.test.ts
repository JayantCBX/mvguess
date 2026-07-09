import { describe, expect, it } from "vitest";
import {
  applyHintPositions,
  calculateHiddenPercent,
  calculateMaxHintCount,
  defaultHintSettings,
  generateDifficultyAutoHintPositions,
  generateManualHintMask,
  generateRandomHintPositions,
  generateSmartRandomHintPositions,
  getFirstAlphabetPosition,
  getLastAlphabetPosition,
  getSelectableHintPositions,
  isVowel,
  validateHintPositions
} from "../lib/game/hints";

describe("hint system", () => {
  it("returns only alphabet positions as selectable", () => {
    expect(getSelectableHintPositions("3 Idiots")).toEqual([2, 3, 4, 5, 6, 7]);
  });

  it("creates manual hint masks and duplicate reveal", () => {
    const result = generateManualHintMask("Dhoom", [2], { ...defaultHintSettings, revealDuplicateLetters: true });
    expect(result.maskedMovie).toBe("__OO_");
    expect(result.hintPositions).toEqual([2, 3]);
  });

  it("can reveal only the selected duplicate position", () => {
    expect(applyHintPositions("Dhoom", [2], { ...defaultHintSettings, revealDuplicateLetters: false })).toBe("__O__");
  });

  it("blocks vowels, first letters, and last letters when configured", () => {
    expect(isVowel("A")).toBe(true);
    expect(getFirstAlphabetPosition("3 Idiots")).toBe(2);
    expect(getLastAlphabetPosition("3 Idiots")).toBe(7);

    const validation = validateHintPositions("3 Idiots", [2, 4, 7], {
      ...defaultHintSettings,
      allowVowelHints: false,
      allowFirstLetterHint: false,
      allowLastLetterHint: false
    }, "easy");

    expect(validation.valid).toBe(false);
    expect(validation.errors.join(" ")).toContain("Vowel hints are disabled.");
    expect(validation.errors.join(" ")).toContain("First letter hint is disabled.");
    expect(validation.errors.join(" ")).toContain("Last letter hint is disabled.");
  });

  it("enforces minimum hidden percent and difficulty hint limits", () => {
    const validation = validateHintPositions("Sholay", [0, 1, 2, 3, 4], defaultHintSettings, "medium");
    expect(validation.valid).toBe(false);
    expect(validation.errors.join(" ")).toContain("40%");
    expect(calculateHiddenPercent("Sholay", [0, 1])).toBe(67);
  });

  it("calculates short and long movie hint limits", () => {
    expect(calculateMaxHintCount("PK", "easy", defaultHintSettings)).toBe(1);
    expect(calculateMaxHintCount("PK", "hard", defaultHintSettings)).toBe(0);
    expect(calculateMaxHintCount("Kabhi Khushi Kabhie Gham", "medium", defaultHintSettings)).toBe(4);
  });

  it("generates random, smart random, no hint, and difficulty auto hints", () => {
    const random = generateRandomHintPositions("Sholay", "easy", defaultHintSettings);
    const smart = generateSmartRandomHintPositions("Kabhi Khushi Kabhie Gham", "medium", defaultHintSettings);
    const auto = generateDifficultyAutoHintPositions("Sholay", "easy", defaultHintSettings);

    expect(random.length).toBeLessThanOrEqual(2);
    expect(smart.length).toBeLessThanOrEqual(4);
    expect(auto).toContain(0);
    expect(applyHintPositions("3 Idiots", [], defaultHintSettings)).toBe("3 ______");
  });
});

