import type { Difficulty, ValidationResult } from "./game";

export type HintMode = "manual" | "random" | "smart_random" | "none" | "difficulty_auto";

export interface HintSettings {
  hintMode: HintMode;
  hintRevealPercent: number;
  allowVowelHints: boolean;
  revealDuplicateLetters: boolean;
  allowFirstLetterHint: boolean;
  allowLastLetterHint: boolean;
  minimumHiddenPercent: number;
  hostCanPreviewMovie: boolean;
  allowManualOverride: boolean;
}

export interface HintState {
  selectedPositions: number[];
  hintLetters: string[];
  maskedPreview: string;
  validationErrors: string[];
  isLocked: boolean;
}

export interface MaskResult {
  maskedMovie: string;
  hintPositions: number[];
  revealedLetters: string[];
  hiddenPercent: number;
}

export type { Difficulty, ValidationResult };
