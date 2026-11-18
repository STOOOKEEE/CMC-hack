"use client";

export default function AssetError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-2xl space-y-4 pt-6" role="alert">
      <h1 className="text-2xl font-semibold">This asset could not be loaded</h1>
      <p className="text-muted">
        Market data is probably temporarily unavailable. Please try again in a minute, or pick another asset.
      </p>
      <button
        type="button"
        onClick={reset}
        className="min-h-11 rounded-lg border border-border bg-surface px-4 hover:border-accent"
      >
        Try again
      </button>
    </div>
  );
}
