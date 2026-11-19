import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of use — WrapScout",
  description: "What WrapScout is, what it is not, and where its data comes from.",
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-6 leading-relaxed">
      <h1 className="text-3xl font-semibold tracking-tight">Terms of use</h1>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Information only — not financial advice</h2>
        <p className="text-muted">
          WrapScout compares the tokenized versions of real-world assets. It does not tell you to buy, sell or hold
          anything, and nothing on this site is financial, investment, legal or tax advice. A &quot;Best pick&quot; is
          the result of a published formula applied to market data, not a recommendation.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Check before you trade</h2>
        <p className="text-muted">
          Tokenized stocks, ETFs and commodities are issued by third parties under their own terms. Many are not
          available to residents of some countries (for example US persons) or require identity checks. Check each
          issuer&apos;s terms and your local rules before trading.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Data</h2>
        <p className="text-muted">
          Market data comes from the CoinMarketCap API and may be delayed, incomplete or wrong. When live data is
          unavailable, a dated snapshot is shown with a banner. Issuer availability notes are hand-written, not
          CoinMarketCap data, and may be outdated. See <Link href="/method" className="text-accent hover:underline">how
          the score works</Link>.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">No warranty</h2>
        <p className="text-muted">
          WrapScout is provided as is, without warranty of any kind, as a project built for the Build with CMC API
          Hackathon. Use it at your own risk.
        </p>
      </section>
    </article>
  );
}
