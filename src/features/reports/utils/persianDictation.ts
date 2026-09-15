/**
 * Persian dictation post-processing.
 * Web Speech returns raw, unpunctuated Persian that mixes Arabic code points,
 * drops half-spaces and spells punctuation out loud. Pure text helpers only.
 */
const HALF_SPACE = '\u200c'
const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'] as const

const CHARACTER_FIXES: readonly (readonly [RegExp, string])[] = [
  [/\u064A/g, '\u06CC'],
  [/\u0649/g, '\u06CC'],
  [/\u0643/g, '\u06A9'],
  [/[\u064B-\u0652\u0670]/g, ''],
  [/[\u200E\u200F\u061C]/g, ''],
  [/\u00A0/g, ' '],
]

/** Multi-word phrases first, otherwise the shorter token eats them. */
const SPOKEN_TOKENS: readonly (readonly [RegExp, string])[] = [
  [/(^|\s)(پاراگراف جدید|بند جدید)(?=\s|$)/g, '\n\n'],
  [/(^|\s)(خط جدید|سطر جدید|سر خط)(?=\s|$)/g, '\n'],
  [/(^|\s)(نقطه ویرگول)(?=\s|$)/g, '$1؛'],
  [/(^|\s)(علامت سوال|علامت سؤال)(?=\s|$)/g, '$1؟'],
  [/(^|\s)(علامت تعجب)(?=\s|$)/g, '$1!'],
  [/(^|\s)(دو نقطه)(?=\s|$)/g, '$1:'],
  [/(^|\s)(ویرگول|کاما)(?=\s|$)/g, '$1،'],
  [/(^|\s)(نقطه)(?=\s|$)/g, '$1.'],
  [/(^|\s)(پرانتز باز)(?=\s|$)/g, '$1('],
  [/(^|\s)(پرانتز بسته)(?=\s|$)/g, '$1)'],
  [/(^|\s)(درصد)(?=\s|$)/g, '$1٪'],
]

const HALF_SPACE_RULES: readonly (readonly [RegExp, string])[] = [
  [/(^|\s)(ن?می) (?=[\u0600-\u06FF])/g, '$1$2' + HALF_SPACE],
  [/([\u0600-\u06FF]) (ها|های|هایی|هایم|هایت|هایش|تر|تری|ترین)(?=\s|[.،؛:؟!)]|$)/g, '$1' + HALF_SPACE + '$2'],
  [/([\u0600-\u06FF]) (ام|اید|ایم|اند)(?=\s|[.،؛:؟!)]|$)/g, '$1' + HALF_SPACE + '$2'],
]

export interface NormalizeDictatedTextOptions {
  /** Keep the trailing space of an in-progress (interim) phrase. */
  keepTrailingSpace?: boolean
  persianDigits?: boolean
}

/** Turn one raw recognition chunk into publication-ready Persian text. */
export function normalizeDictatedText(input: string, options: NormalizeDictatedTextOptions = {}): string {
  if (!input) return ''
  const { keepTrailingSpace = false, persianDigits = true } = options
  let text = input.replace(/[\t\r]+/g, ' ')
  for (const [pattern, replacement] of CHARACTER_FIXES) text = text.replace(pattern, replacement)
  for (const [pattern, replacement] of SPOKEN_TOKENS) text = text.replace(pattern, replacement)
  for (const [pattern, replacement] of HALF_SPACE_RULES) text = text.replace(pattern, replacement)
  text = text
    .replace(/ +([.،؛:؟!٪)])/g, '$1')
    .replace(/(\() +/g, '$1')
    .replace(/([.،؛:؟!])(?=[^\s\n.،؛:؟!)])/g, '$1 ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/ {2,}/g, ' ')
  if (persianDigits) text = text.replace(/[0-9]/g, (digit) => PERSIAN_DIGITS[Number(digit)])
  return keepTrailingSpace ? text.replace(/^ +/, '') : text.trim()
}

/** Append a finalised chunk without breaking the user's own spacing. */
export function appendDictatedText(previous: string, addition: string): string {
  const chunk = addition.replace(/^ +/, '').replace(/ +$/, '')
  if (!chunk) return previous
  if (!previous) return chunk
  if (chunk.startsWith('\n') || /\n$/.test(previous)) return previous + chunk
  if (/^[.،؛:؟!٪)]/.test(chunk)) return previous + chunk
  if (/[ \u200c]$/.test(previous)) return previous + chunk
  return previous + ' ' + chunk
}
