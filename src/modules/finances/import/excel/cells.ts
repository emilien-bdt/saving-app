export function columnIndex(column: string): number {
  let index = 0;
  for (const char of column) index = index * 26 + (char.charCodeAt(0) - 64);
  return index;
}

export function columnName(index: number): string {
  let name = "";
  for (let rest = index; rest > 0; rest = Math.floor((rest - 1) / 26)) {
    name = String.fromCharCode(65 + ((rest - 1) % 26)) + name;
  }
  return name;
}

/** offsetColumn("J", -4) → "F". */
export function offsetColumn(column: string, delta: number): string {
  return columnName(columnIndex(column) + delta);
}
