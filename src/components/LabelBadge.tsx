import type { Label } from "@/lib/model";

const STYLES: Record<Label, { text: string; className: string }> = {
  best: { text: "Best pick", className: "bg-good-soft text-good" },
  only_option: { text: "Only option", className: "bg-good-soft text-good" },
  good: { text: "Good alternative", className: "bg-accent-soft text-accent" },
  weak: { text: "Weak", className: "bg-surface-2 text-muted" },
  too_thin: { text: "Too thin", className: "bg-warn-soft text-warn" },
  different_unit: { text: "Different unit", className: "bg-warn-soft text-warn" },
  derivative: { text: "Derivative", className: "bg-surface-2 text-muted" },
  no_market: { text: "No market", className: "bg-bad-soft text-bad" },
};

export function LabelBadge({ label }: { label: Label }) {
  const s = STYLES[label];
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${s.className}`}>
      {s.text}
    </span>
  );
}
