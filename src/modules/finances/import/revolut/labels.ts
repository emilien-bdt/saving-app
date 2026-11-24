/** Prefixes added by Revolut around the counterpart's name. */
const PREFIXES: RegExp[] = [
  /^paiement envoy[ée] par\s*:?\s*/i,
  /^paiement de\s*:?\s*/i,
  /^payment from\s*:?\s*/i,
  /^virement (?:à|a|de|vers|depuis)\s*:?\s*/i,
  /^transfer (?:to|from)\s*:?\s*/i,
  /^to\s*:\s*/i,
  /^from\s*:\s*/i,
];

const SHORT_UPPERCASE = /^[\p{Lu}\d]{1,3}$/u;

/** « EMILIEN BOURDET & ZOÉ » → « Emilien Bourdet & Zoé »; short acronyms (SAS, EDF) stay as they are. */
function softenUppercase(text: string): string {
  const letters = text.replace(/[^\p{L}]/gu, "");
  if (letters.length < 4 || letters !== letters.toUpperCase()) return text;
  return text
    .split(" ")
    .map((word) =>
      SHORT_UPPERCASE.test(word) ? word : word.charAt(0) + word.slice(1).toLocaleLowerCase("fr"),
    )
    .join(" ");
}

/**
 * Label of an imported operation, from the Revolut description:
 * « Paiement envoyé par OPEN SAS » → « OPEN SAS », « Virement à : JEAN DUPONT » → « Jean Dupont ».
 */
export function cleanRevolutLabel(description: string): string {
  let label = description.replace(/\s+/g, " ").trim();
  for (const prefix of PREFIXES) {
    const stripped = label.replace(prefix, "");
    if (stripped !== label && stripped.trim() !== "") {
      label = stripped.trim();
      break;
    }
  }
  label = softenUppercase(label);
  if (label === "") label = "Opération Revolut";
  return label.length > 120 ? `${label.slice(0, 119)}…` : label;
}
