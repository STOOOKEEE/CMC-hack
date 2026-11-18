export default function Loading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-2/3 rounded bg-surface-2" />
      <div className="h-4 w-1/3 rounded bg-surface-2" />
      <div className="h-56 rounded-xl bg-surface-2" />
      <div className="h-72 rounded-xl bg-surface-2" />
    </div>
  );
}
