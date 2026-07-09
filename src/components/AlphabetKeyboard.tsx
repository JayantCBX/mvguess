interface AlphabetKeyboardProps {
  guessedLetters: string[];
  disabled?: boolean;
  onGuess: (letter: string) => void;
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function AlphabetKeyboard({ guessedLetters, disabled = false, onGuess }: AlphabetKeyboardProps) {
  return (
    <div className="grid grid-cols-7 gap-2 sm:grid-cols-13">
      {LETTERS.map((letter) => {
        const used = guessedLetters.includes(letter);
        return (
          <button
            key={letter}
            type="button"
            disabled={disabled || used}
            onClick={() => onGuess(letter)}
            className="aspect-square rounded-md border border-white/10 bg-white/10 text-sm font-bold text-white transition hover:border-cinema-gold hover:bg-cinema-gold hover:text-cinema-ink disabled:cursor-not-allowed disabled:opacity-30"
            aria-label={`Guess ${letter}`}
          >
            {letter}
          </button>
        );
      })}
    </div>
  );
}
