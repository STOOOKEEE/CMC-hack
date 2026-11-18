import issuersData from "../../data/issuers.json";

export interface IssuerNote {
  label: string;
  note: string | null;
  url: string | null;
}

interface IssuerEntry extends IssuerNote {
  match: string[];
}

const ISSUERS: IssuerEntry[] = (issuersData as { issuers: IssuerEntry[] }).issuers;

/** Hand-curated access note for an issuer (spec §6.6). Not CMC data; never used in scoring. */
export function issuerNote(issuerName: string | null): IssuerNote | null {
  if (!issuerName) return null;
  const name = issuerName.toLowerCase();
  const hit = ISSUERS.find((i) => i.match.some((m) => name.includes(m)));
  return hit ? { label: hit.label, note: hit.note, url: hit.url } : null;
}
