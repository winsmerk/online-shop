export function Progress({ value }: { value: number }) {
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-black/5" aria-label={`进度 ${value}%`}>
      <div className="h-full rounded-full bg-coral transition-all" style={{ width: `${Math.max(0, Math.min(value, 100))}%` }} />
    </div>
  );
}
