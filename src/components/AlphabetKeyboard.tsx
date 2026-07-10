interface AlphabetKeyboardProps {
  guessedLetters: string[];
  disabled?: boolean;
  onGuess: (letter: string) => void;
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function AlphabetKeyboard({ guessedLetters, disabled = false, onGuess }: AlphabetKeyboardProps) {
  return (
    <div className="keyboard-grid grid [grid-template-columns:repeat(auto-fit,minmax(44px,1fr))] gap-2">
      {LETTERS.map((letter) => {
        const used = guessedLetters.includes(letter);
        return (
          <button
            key={letter}
            type="button"
            disabled={disabled || used}
            onClick={() => onGuess(letter)}
            className="letter-key aspect-square min-h-11 min-w-0 rounded-xl text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-25"
            aria-label={`Guess ${letter}`}
          >
            {letter}
          </button>
        );
      })}
    </div>
  );
}
