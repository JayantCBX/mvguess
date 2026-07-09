export const ALPHABET_REGEX = /[A-Za-z]/;

export function isAlphabet(char: string): boolean {
  return ALPHABET_REGEX.test(char);
}

export function normalizeMovieTitle(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .toUpperCase();
}

export function createMaskedMovie(title: string, revealedPositions: number[] = []): string {
  const revealed = new Set(revealedPositions);
  return [...title]
    .map((char, index) => {
      if (!isAlphabet(char)) return char;
      return revealed.has(index) ? char.toUpperCase() : "_";
    })
    .join("");
}

export function revealLetter(title: string, currentMask: string, letter: string): string {
  const normalized = letter.toUpperCase();
  return [...title]
    .map((char, index) => {
      if (!isAlphabet(char)) return char;
      if (char.toUpperCase() === normalized) return char.toUpperCase();
      return currentMask[index] && currentMask[index] !== "_" ? currentMask[index] : "_";
    })
    .join("");
}

export function isMovieSolved(title: string, maskedMovie: string): boolean {
  return normalizeMovieTitle(title) === normalizeMovieTitle(maskedMovie);
}

export function getRevealedLetters(title: string, positions: number[]): string[] {
  return [...new Set(positions.map((position) => title[position]?.toUpperCase()).filter(Boolean))];
}

export function getAlphabetPositions(title: string): number[] {
  return [...title].flatMap((char, index) => (isAlphabet(char) ? [index] : []));
}
