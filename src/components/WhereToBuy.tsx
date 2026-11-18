import { shortAddress } from "@/lib/format";
import { issuerNote } from "@/lib/issuers";
import type { Wrapper } from "@/lib/model";

const NO_EXCHANGES: Record<Exclude<Wrapper["exchangesStatus"], "listed">, string> = {
  none: "CoinMarketCap tracks no exchange market for it — it may only trade on-chain or through the issuer.",
  not_fetched: "Exchange list not loaded for this version — use the chain and contract below.",
  plan: "Exchange lists are not available on our CoinMarketCap plan — use the chain and contract below.",
};

/** Spec §6.4: exchanges when CMC gives them, always chain + contract + explorer, plus the issuer note (§6.6). */
export function WhereToBuy({ wrapper }: { wrapper: Wrapper }) {
  const issuer = issuerNote(wrapper.issuerName);
  return (
    <div className="space-y-2 text-sm" data-testid="where-to-buy">
      <h3 className="font-medium">Where to buy</h3>
      {wrapper.exchangesStatus === "listed" ? (
        <p>
          <span className="text-muted">Markets on CoinMarketCap: </span>
          {wrapper.exchanges.join(" · ")}
        </p>
      ) : (
        <p className="text-muted">{NO_EXCHANGES[wrapper.exchangesStatus]}</p>
      )}
      <p>
        <span className="text-muted">Chain: </span>
        {wrapper.chain ?? "Unknown chain"}
        {wrapper.contract ? (
          <>
            {" · "}
            <span className="text-muted">Contract: </span>
            {wrapper.explorerUrl ? (
              <a
                href={wrapper.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-accent underline-offset-2 hover:underline"
                title={wrapper.contract}
              >
                {shortAddress(wrapper.contract)} ↗
              </a>
            ) : (
              <span className="font-mono" title={wrapper.contract}>
                {shortAddress(wrapper.contract)}
              </span>
            )}
          </>
        ) : null}
      </p>
      {issuer ? (
        <div className="rounded-md bg-surface-2 px-3 py-2 text-xs leading-relaxed">
          <p>
            <span className="font-medium">{issuer.label}</span>
            {issuer.note ? <> — {issuer.note}</> : <> — check eligibility on the issuer&apos;s site.</>}
            {issuer.url ? (
              <>
                {" "}
                <a href={issuer.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                  Issuer site ↗
                </a>
              </>
            ) : null}
          </p>
          <p className="mt-1 text-muted">Issuer info, not CMC data — may be outdated.</p>
        </div>
      ) : null}
    </div>
  );
}
