import type { Difficulty, ValidationResult } from "../../types/game";
import type { HintSettings, MaskResult } from "../../types/hints";
import { createMaskedMovie, getAlphabetPositions, getRevealedLetters, isAlphabet } from "./masking";

const VOWELS = new Set(["A", "E", "I", "O", "U"]);

export const defaultHintSettings: HintSettings = {
  hintMode: "difficulty_auto",
  hintRevealPercent: 15,
  allowVowelHints: true,
  revealDuplicateLetters: true,
  allowFirstLetterHint: true,
  allowLastLetterHint: true,
  minimumHiddenPercent: 40,
  hostCanPreviewMovie: true,
  allowManualOverride: true
};

export function isVowel(char: string): boolean {
  return VOWELS.has(char.toUpperCase());
}

export function getSelectableHintPositions(title: string): number[] {
  return getAlphabetPositions(title);
}

export function getFirstAlphabetPosition(title: string): number | null {
  return getSelectableHintPositions(title)[0] ?? null;
}

export function getLastAlphabetPosition(title: string): number | null {
  const positions = getSelectableHintPositions(title);
  return positions[positions.length - 1] ?? null;
}

export function shouldRevealDuplicateLetter(_title: string, _position: number, options: HintSettings): boolean {
  return options.revealDuplicateLetters;
}

export function calculateHiddenPercent(title: string, hintPositions: number[]): number {
  const alphabetCount = getSelectableHintPositions(title).length;
  if (alphabetCount === 0) return 100;
  const hintedAlphabetCount = new Set(hintPositions.filter((position) => isAlphabet(title[position] ?? ""))).size;
  return Math.round(((alphabetCount - hintedAlphabetCount) / alphabetCount) * 100);
}

export function calculateMaxHintCount(title: string, difficulty: Difficulty, options: HintSettings): number {
  const alphabetCount = getSelectableHintPositions(title).length;
  if (alphabetCount <= 4) {
    return { easy: 1, medium: 1, hard: 0, expert: 0 }[difficulty];
  }
  if (alphabetCount <= 8) {
    return { easy: 2, medium: 1, hard: 1, expert: 0 }[difficulty];
  }
  if (alphabetCount <= 14) {
    return { easy: 4, medium: 2, hard: 1, expert: 1 }[difficulty];
  }

  const percentageCap = { easy: 0.3, medium: 0.2, hard: 0.1, expert: 0.05 }[difficulty];
  const requested = Math.ceil(alphabetCount * Math.min(options.hintRevealPercent, percentageCap * 100) / 100);
  return Math.max(0, Math.min(Math.floor(alphabetCount * percentageCap), requested));
}

function expandDuplicatePositions(title: string, selectedPositions: number[], options: HintSettings): number[] {
  const expanded = new Set<number>();
  selectedPositions.forEach((position) => {
    if (!isAlphabet(title[position] ?? "")) return;
    expanded.add(position);
    if (shouldRevealDuplicateLetter(title, position, options)) {
      const target = title[position].toUpperCase();
      [...title].forEach((char, index) => {
        if (char.toUpperCase() === target && isAlphabet(char)) expanded.add(index);
      });
    }
  });
  return [...expanded].sort((a, b) => a - b);
}

export function validateHintPositions(
  title: string,
  selectedPositions: number[],
  options: HintSettings,
  difficulty: Difficulty = "medium"
): ValidationResult {
  const errors: string[] = [];
  const first = getFirstAlphabetPosition(title);
  const last = getLastAlphabetPosition(title);
  const expanded = expandDuplicatePositions(title, selectedPositions, options);
  const maxHints = calculateMaxHintCount(title, difficulty, options);

  selectedPositions.forEach((position) => {
    const char = title[position];
    if (position < 0 || position >= title.length) errors.push("Hint position is outside the title.");
    else if (!isAlphabet(char)) errors.push("Hints can only be placed on alphabet letters.");
    else if (!options.allowVowelHints && isVowel(char)) errors.push("Vowel hints are disabled.");
    if (!options.allowFirstLetterHint && position === first) errors.push("First letter hint is disabled.");
    if (!options.allowLastLetterHint && position === last) errors.push("Last letter hint is disabled.");
  });

  if (expanded.length >= getSelectableHintPositions(title).length && expanded.length > 0) {
    errors.push("At least one alphabet letter must remain hidden.");
  }
  if (calculateHiddenPercent(title, expanded) < options.minimumHiddenPercent) {
    errors.push(`At least ${options.minimumHiddenPercent}% of alphabet letters must remain hidden.`);
  }
  if (expanded.length > maxHints) {
    errors.push(`Too many hints for this difficulty. Maximum allowed is ${maxHints}.`);
  }

  return { valid: errors.length === 0, errors: [...new Set(errors)] };
}

export function applyHintPositions(title: string, hintPositions: number[], options: HintSettings = defaultHintSettings): string {
  const expanded = expandDuplicatePositions(title, hintPositions, options);
  return createMaskedMovie(title, expanded);
}

export function generateManualHintMask(title: string, selectedPositions: number[], options: HintSettings): MaskResult {
  const hintPositions = expandDuplicatePositions(title, selectedPositions, options);
  return {
    maskedMovie: createMaskedMovie(title, hintPositions),
    hintPositions,
    revealedLetters: getRevealedLetters(title, hintPositions),
    hiddenPercent: calculateHiddenPercent(title, hintPositions)
  };
}

function allowedPositions(title: string, difficulty: Difficulty, options: HintSettings): number[] {
  const first = getFirstAlphabetPosition(title);
  const last = getLastAlphabetPosition(title);
  return getSelectableHintPositions(title).filter((position) => {
    const char = title[position];
    if (!options.allowVowelHints && isVowel(char)) return false;
    if (!options.allowFirstLetterHint && position === first) return false;
    if (!options.allowLastLetterHint && position === last) return false;
    if (difficulty === "hard" || difficulty === "expert") {
      return position !== first && position !== last;
    }
    return true;
  });
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }
  return copy;
}

export function generateRandomHintPositions(title: string, difficulty: Difficulty, options: HintSettings): number[] {
  const maxHints = calculateMaxHintCount(title, difficulty, options);
  if (maxHints <= 0) return [];
  return shuffle(allowedPositions(title, difficulty, options)).slice(0, maxHints).sort((a, b) => a - b);
}

export function generateSmartRandomHintPositions(title: string, difficulty: Difficulty, options: HintSettings): number[] {
  const maxHints = calculateMaxHintCount(title, difficulty, options);
  if (maxHints <= 0) return [];

  const positions = allowedPositions(title, difficulty, options);
  const consonants = positions.filter((position) => !isVowel(title[position]));
  const vowels = positions.filter((position) => isVowel(title[position]));
  const pool = [...shuffle(consonants), ...shuffle(vowels).slice(0, Math.max(1, Math.floor(maxHints / 3)))];
  const alphabetCount = getSelectableHintPositions(title).length;
  const targetCount = alphabetCount <= 8 ? Math.min(maxHints, 1) : maxHints;

  return pool.slice(0, targetCount).sort((a, b) => a - b);
}

export function generateDifficultyAutoHintPositions(title: string, difficulty: Difficulty, options: HintSettings): number[] {
  if (difficulty === "expert") return generateSmartRandomHintPositions(title, difficulty, options);
  const picks = new Set<number>();
  const first = getFirstAlphabetPosition(title);
  const last = getLastAlphabetPosition(title);
  const maxHints = calculateMaxHintCount(title, difficulty, options);

  if (difficulty === "easy" && options.allowFirstLetterHint && first !== null) picks.add(first);
  if (difficulty === "easy" && options.allowLastLetterHint && last !== null && picks.size < maxHints) picks.add(last);

  for (const position of generateSmartRandomHintPositions(title, difficulty, options)) {
    if (picks.size >= maxHints) break;
    picks.add(position);
  }

  return [...picks].sort((a, b) => a - b);
}
