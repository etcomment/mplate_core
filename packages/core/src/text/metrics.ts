const ASCII_WIDTHS: number[] = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
]

const SAFETY_FACTOR = 1.07
const BOLD_FACTOR = 1.07
const DEFAULT_WIDTH = 556
const WIDE_WIDTH = 1000

function isWideCharacter(codePoint: number): boolean {
  return (codePoint >= 0x2e80 && codePoint <= 0x9fff) || (codePoint >= 0xac00 && codePoint <= 0xd7af) || (codePoint >= 0x1f300 && codePoint <= 0x1faff)
}

function baseCharacter(character: string): string {
  return character.normalize('NFD').charAt(0)
}

export function characterWidth(character: string): number {
  const codePoint = character.codePointAt(0) ?? 32
  if (codePoint >= 32 && codePoint <= 126) return ASCII_WIDTHS[codePoint - 32] ?? DEFAULT_WIDTH
  if (isWideCharacter(codePoint)) return WIDE_WIDTH
  const base = baseCharacter(character)
  const baseCode = base.codePointAt(0) ?? 0
  if (baseCode >= 32 && baseCode <= 126) return ASCII_WIDTHS[baseCode - 32] ?? DEFAULT_WIDTH
  return DEFAULT_WIDTH
}

export function measureText(text: string, fontSize: number, weight: number = 400): number {
  let units = 0
  for (const character of text) units += characterWidth(character)
  const weightFactor = weight >= 600 ? BOLD_FACTOR : 1
  return (units / 1000) * fontSize * SAFETY_FACTOR * weightFactor
}
