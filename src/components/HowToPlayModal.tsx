import { X } from "lucide-react";

interface HowToPlayModalProps {
  open: boolean;
  onClose: () => void;
}

export function HowToPlayModal({ open, onClose }: HowToPlayModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/70 p-4">
      <div className="w-full max-w-xl rounded-lg border border-white/10 bg-cinema-panel p-5 shadow-glow">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black">How to play</h2>
          <button type="button" onClick={onClose} className="rounded-md p-2 hover:bg-white/10" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
          <p>Create or join a private room with 2 to 8 players. The host configures capacity, category, difficulty, timer, life word, and hints.</p>
          <p>Players guess alphabets turn by turn. Correct letters reveal everywhere they appear. Wrong letter guesses deduct one life letter.</p>
          <p>A full movie guess can win the round immediately. A wrong full movie guess deducts two life letters.</p>
        </div>
      </div>
    </div>
  );
}
