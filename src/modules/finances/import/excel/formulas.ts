/** Rows summed by a block header such as `SUMIF(K3:K14,"ü",J3:J14)`. */
export type SumifRange = { checkColumn: string; amountColumn: string; firstRow: number; lastRow: number };

const SUMIF_PATTERN =
  /^SUMIF\(\$?([A-Z]+)\$?(\d+):\$?([A-Z]+)\$?(\d+),"ü",\$?([A-Z]+)\$?(\d+):\$?([A-Z]+)\$?(\d+)\)$/;

export function parseSumifRange(formula: string): SumifRange | null {
  const match = SUMIF_PATTERN.exec(formula.replace(/\s+/g, "").replace(/^=/, ""));
  if (!match) return null;
  const [, checkFrom, checkFirst, checkTo, checkLast, amountFrom, amountFirst, amountTo, amountLast] = match;
  if (!checkFrom || !amountFrom || checkFrom !== checkTo || amountFrom !== amountTo) return null;
  if (checkFirst !== amountFirst || checkLast !== amountLast) return null;
  return { checkColumn: checkFrom, amountColumn: amountFrom, firstRow: Number(checkFirst), lastRow: Number(checkLast) };
}

/** "15+15+1.95" → [15, 15, 1.95]; null when the formula is not a plain sum of constants. */
export function splitConstantSum(formula: string): number[] | null {
  const body = formula.replace(/\s+/g, "").replace(/^=/, "").replace(/^\+/, "");
  if (!/^\d+(?:\.\d+)?(?:\+\d+(?:\.\d+)?)+$/.test(body)) return null;
  return body.split("+").map(Number);
}
