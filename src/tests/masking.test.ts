import { describe, expect, it } from "vitest";
import { createMaskedMovie, isMovieSolved, normalizeMovieTitle, revealLetter } from "../lib/game/masking";

describe("movie masking", () => {
  it("normalizes titles ignoring punctuation, spaces, and case", () => {
    expect(normalizeMovieTitle("Kabhi Khushi, Kabhie Gham!")).toBe("KABHIKHUSHIKABHIEGHAM");
    expect(isMovieSolved("3 Idiots", "3 idiots")).toBe(true);
  });

  it("keeps spaces, punctuation, and numbers visible", () => {
    expect(createMaskedMovie("3 Idiots")).toBe("3 ______");
    expect(createMaskedMovie("Mughal-E-Azam")).toBe("______-_-____");
  });

  it("reveals repeated letters for alphabet guesses", () => {
    const mask = createMaskedMovie("Dhoom");
    expect(revealLetter("Dhoom", mask, "o")).toBe("__OO_");
  });
});
