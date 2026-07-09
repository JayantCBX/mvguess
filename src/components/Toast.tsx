interface ToastProps {
  message: string;
}

export function Toast({ message }: ToastProps) {
  if (!message) return null;
  return (
    <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-md border border-cinema-gold/30 bg-cinema-ink px-4 py-3 text-sm shadow-glow">
      {message}
    </div>
  );
}
