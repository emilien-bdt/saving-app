/** Prefixes added by the banks around the counterpart's name (Revolut, BoursoBank). */
const PREFIXES: RegExp[] = [
  /^paiement envoy[ée] par\s*:?\s*/i,
  /^paiement de\s*:?\s*/i,
  /^payment from\s*:?\s*/i,
  /^virement (?:à|a|de|vers|depuis)\s*:?\s*/i,
  /^transfer (?:to|from)\s*:?\s*/i,
  /^to\s*:\s*/i,
  /^from\s*:\s*/i,
  // BoursoBank: « CARTE 12/11/26 CARREFOUR CB*1234 », « AVOIR 12/11/26 … », « PRLV SEPA FREE MOBILE », « VIR SEPA … »
  /^(?:carte|avoir)\s+\d{2}\/\d{2}\/\d{2,4}\s+/i,
  /^prlv\s+(?:sepa\s+)?/i,
  /^vir(?:ement)?\s+(?:sepa\s+|inst\s+|instantan[ée]\s+)*(?:re[çc]u\s+)?(?:\/de\s+|de\s+)?/i,
];

/** BoursoBank suffixes: card number, payment details. */
const SUFFIXES: RegExp[] = [/\s+CB\*\d{4}$/i, /\s+\/(?:motif|ref|réf|de|a)\b.*$/i];

const SHORT_UPPERCASE = /^[\p{Lu}\d]{1,3}$/u;
/** Short words in capitals that are not acronyms: « LE PETIT BISTROT » → « Le Petit Bistrot ». */
const SMALL_WORDS = new Set(["LE", "LA", "LES", "DE", "DU", "DES", "ET", "AU", "AUX", "EN", "OU", "UN", "UNE", "MR", "MME", "SUR", "PAR", "CHEZ"]);

/** « EMILIEN BOURDET & ZOÉ » → « Emilien Bourdet & Zoé »; short acronyms (SAS, EDF) stay as they are; « MASSON Zoe » → « Masson Zoe ». */
function softenUppercase(text: string): string {
  const letters = text.replace(/[^\p{L}]/gu, "");
  if (letters.length < 4) return text;
  if (letters !== letters.toUpperCase()) {
    // Mixed case (« MASSON Zoe »): only long words in capitals are softened (short ones may be acronyms).
    return text
      .split(" ")
      .map((word) => (/^\p{Lu}{4,}$/u.test(word) ? word.charAt(0) + word.slice(1).toLocaleLowerCase("fr") : word))
      .join(" ");
  }
  return text
    .split(" ")
    .map((word) =>
      SHORT_UPPERCASE.test(word) && !SMALL_WORDS.has(word) ? word : word.charAt(0) + word.slice(1).toLocaleLowerCase("fr"),
    )
    .join(" ");
}

/** « uber eats » → « Uber Eats » (BoursoBank gives the merchant in lower case). */
function capitalizeWords(text: string): string {
  return text.replace(/(^|[\s'-])(\p{Ll})/gu, (_, before: string, letter: string) => before + letter.toLocaleUpperCase("fr"));
}

const truncate = (label: string) => (label.length > 120 ? `${label.slice(0, 119)}…` : label);

/**
 * Label of an imported operation, from the bank description (or the merchant found by the bank):
 * « Paiement envoyé par OPEN SAS » → « Open SAS », « CARTE 12/11/26 CARREFOUR CB*1234 » → « Carrefour ».
 */
export function cleanBankLabel(description: string, merchant: string | null = null): string {
  const found = merchant?.replace(/\s+/g, " ").trim();
  if (found) return truncate(found === found.toLowerCase() ? capitalizeWords(found) : found);

  let label = description.replace(/\s+/g, " ").trim();
  // Prefixes can stack: « VIR Virement de Zoé » → « Virement de Zoé » → « Zoé ».
  for (let pass = 0; pass < 3; pass++) {
    const prefix = PREFIXES.find((candidate) => {
      const stripped = label.replace(candidate, "");
      return stripped !== label && stripped.trim() !== "";
    });
    if (!prefix) break;
    label = label.replace(prefix, "").trim();
  }
  for (const suffix of SUFFIXES) {
    const stripped = label.replace(suffix, "");
    if (stripped.trim() !== "") label = stripped.trim();
  }
  label = softenUppercase(label);
  return truncate(label === "" ? "Opération bancaire" : label);
}
