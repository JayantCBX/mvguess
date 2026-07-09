interface ConnectionStatusProps {
  online: boolean;
  configured: boolean;
}

export function ConnectionStatus({ online, configured }: ConnectionStatusProps) {
  const label = !configured ? "Local mode" : online ? "Online connected" : "Offline";
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-slate-200">
      <span className={`h-2 w-2 rounded-full ${online ? "bg-cinema-teal" : configured ? "bg-cinema-rose" : "bg-cinema-gold"}`} />
      {label}
    </span>
  );
}
