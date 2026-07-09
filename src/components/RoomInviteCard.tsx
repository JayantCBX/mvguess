import { Copy, Link as LinkIcon } from "lucide-react";

interface RoomInviteCardProps {
  code: string;
  onCopy: () => void;
}

export function RoomInviteCard({ code, onCopy }: RoomInviteCardProps) {
  const invite = `${location.origin}${location.pathname}?room=${code}`;
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-400">Room code</p>
          <p className="text-3xl font-black text-cinema-gold">{code}</p>
        </div>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-cinema-gold text-cinema-ink"
          aria-label="Copy invite"
          title="Copy invite"
        >
          <Copy className="h-5 w-5" />
        </button>
      </div>
      <p className="mt-3 flex items-center gap-2 truncate text-xs text-slate-400">
        <LinkIcon className="h-4 w-4 shrink-0" />
        {invite}
      </p>
    </div>
  );
}
