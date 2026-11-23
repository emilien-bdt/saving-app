// Normalised key used to recognise the same dish written in different ways
// ("Pâtes carbo", "pates  carbo", "PATES CARBO" → "pates carbo").

export function dishKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’`]/g, "'")
    .replace(/\s*\+\s*/g, " + ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Display form: trimmed, single spaces, first letter upper-cased. */
export function cleanDishName(name: string): string {
  const cleaned = name.replace(/\s*\+\s*/g, " + ").replace(/\s+/g, " ").trim();
  return cleaned.charAt(0).toLocaleUpperCase("fr") + cleaned.slice(1);
}

/** First meaningful word of a dish key ("pates au pesto" → "pates"). */
export function mainIngredientWord(key: string): string {
  const words = key.split(" ").filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  return words[0] ?? key;
}

const STOP_WORDS = new Set(["les", "des", "aux", "avec", "sans", "tadoki", "reste"]);
