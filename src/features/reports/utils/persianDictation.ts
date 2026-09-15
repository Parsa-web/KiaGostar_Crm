/**
 * Persian dictation post-processing.
 *
 * Web Speech returns raw, unpunctuated Persian that mixes Arabic code points,
 * drops half-spaces and spells punctuation out loud. Conversion is done on
 * WORDS, not with regex boundaries, because a chunk can start or end in the
 * middle of a spoken command.
 *
 * Only true multi-word command prefixes ("علامت", "خط", "پاراگراف", …) are
 * held back for the next chunk. Commands that are complete on their own
 * ("نقطه", "ویرگول") are applied immediately, otherwise the symbol only
 * appeared after the user said something else - which looked like the commands
 * were being written out as Persian words.
 */
const HALF_SPACE = '\u200c'
const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'] as const

interface PunctuationToken { kind: 'punct'; value: string }
interface BreakToken { kind: 'break'; value: string }
type SpokenToken = PunctuationToken | BreakToken

/** Spoken punctuation. "درصد" is deliberately absent: it is an ordinary word. */
const SPOKEN: Readonly<Record<string, SpokenToken>> = {
  'نقطه': { kind: 'punct', value: '.' },
  'نقطه ویرگول': { kind: 'punct', value: '؛' },
  'نقطه سر خط': { kind: 'break', value: '\n' },
  'ویرگول': { kind: 'punct', value: '،' },
  'کاما': { kind: 'punct', value: '،' },
  'دو نقطه': { kind: 'punct', value: ':' },
  'علامت سوال': { kind: 'punct', value: '؟' },
  'علامت سؤال': { kind: 'punct', value: '؟' },
  'علامت پرسش': { kind: 'punct', value: '؟' },
  'علامت تعجب': { kind: 'punct', value: '!' },
  'پرانتز باز': { kind: 'punct', value: '(' },
  'پرانتز بسته': { kind: 'punct', value: ')' },
  'گیومه باز': { kind: 'punct', value: '«' },
  'گیومه بسته': { kind: 'punct', value: '»' },
  'خط تیره': { kind: 'punct', value: '—' },
  'خط جدید': { kind: 'break', value: '\n' },
  'سطر جدید': { kind: 'break', value: '\n' },
  'خط بعد': { kind: 'break', value: '\n' },
  'سرخط': { kind: 'break', value: '\n' },
  'سر خط': { kind: 'break', value: '\n' },
  'پاراگراف جدید': { kind: 'break', value: '\n\n' },
  'بند جدید': { kind: 'break', value: '\n\n' },
}

/**
 * Words that are ONLY the first half of a command. A chunk ending with one of
 * these waits for the next chunk; a word that already is a complete command is
 * never held back.
 */
const PARTIAL_PREFIXES = new Set(['علامت', 'دو', 'پرانتز', 'گیومه', 'خط', 'سطر', 'سر', 'پاراگراف', 'بند'])

const CLOSERS = '.،؛:؟!)»'

const HALF_SPACE_RULES: readonly (readonly [RegExp, string])[] = [
  [/(^|\s)(ن?می) (?=[\u0600-\u06FF])/g, '$1$2' + HALF_SPACE],
  [/([\u0600-\u06FF]) (ها|های|هایی|هایم|هایت|هایش|تر|تری|ترین)(?=\s|[.،؛:؟!)»]|$)/g, '$1' + HALF_SPACE + '$2'],
  [/([\u0600-\u06FF]) (ام|اید|ایم|اند)(?=\s|[.،؛:؟!)»]|$)/g, '$1' + HALF_SPACE + '$2'],
]

/** Arabic look-alikes, diacritics and bidi marks the recognizer emits. */
function foldCharacters(input: string): string {
  return input
    .replace(/[\u064A\u0649]/g, '\u06CC')
    .replace(/\u0643/g, '\u06A9')
    .replace(/[\u064B-\u0652\u0670]/g, '')
    .replace(/[\u200E\u200F\u061C]/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/\u0646\u0642\u0637\u0647\u200c\u0648\u06cc\u0631\u06af\u0648\u0644/g, '\u0646\u0642\u0637\u0647 \u0648\u06cc\u0631\u06af\u0648\u0644')
    .replace(/\u0633\u0631\u200c\u062e\u0637/g, '\u0633\u0631\u062e\u0637')
}

/** Every digit shape the recognizer can produce becomes a Persian digit. */
function toPersianDigits(input: string): string {
  return input
    .replace(/[0-9]/g, (digit) => PERSIAN_DIGITS[Number(digit)])
    .replace(/[\u0660-\u0669]/g, (digit) => PERSIAN_DIGITS[digit.charCodeAt(0) - 0x0660])
}

export interface ConvertDictationResult {
  /** Ready-to-insert text; empty when the chunk held only a command prefix. */
  text: string
  /** Unfinished command prefix to pass into the next call. */
  carry: string
}

export interface ConvertDictationOptions {
  /** Interim text: never hold a word back, show everything. */
  flush?: boolean
}

/** Convert one recognition chunk into punctuated Persian text. */
export function convertDictation(raw: string, carry = '', options: ConvertDictationOptions = {}): ConvertDictationResult {
  const { flush = false } = options
  const source = foldCharacters(`${carry} ${raw}`).replace(/[\t\r]+/g, ' ')
  const words = source.split(/\s+/).filter(Boolean)
  let output = ''
  let nextCarry = ''

  for (let index = 0; index < words.length; index += 1) {
    const word = words[index]
    const triple = index + 2 < words.length ? `${word} ${words[index + 1]} ${words[index + 2]}` : ''
    const pair = index + 1 < words.length ? `${word} ${words[index + 1]}` : ''
    const tripleToken = triple ? SPOKEN[triple] : undefined
    const pairToken = pair ? SPOKEN[pair] : undefined
    const token = tripleToken ?? pairToken ?? SPOKEN[word]

    if (!token && !flush && index === words.length - 1 && PARTIAL_PREFIXES.has(word)) {
      nextCarry = word
      break
    }
    if (!token) {
      output += output && !/[\n(«]$/.test(output) ? ` ${word}` : word
      continue
    }
    if (token.kind === 'punct') output = output.replace(/ +$/, '') + token.value
    else output = output.replace(/[ \n]+$/, '') + token.value
    index += tripleToken ? 2 : pairToken ? 1 : 0
  }

  let text = output
  for (const [pattern, replacement] of HALF_SPACE_RULES) text = text.replace(pattern, replacement)
  text = toPersianDigits(text)
    .replace(new RegExp(` +([${CLOSERS}])`, 'g'), '$1')
    .replace(/([(«]) +/g, '$1')
    .replace(new RegExp(`([.،؛:؟!])(?=[^\\s\\n${CLOSERS}])`, 'g'), '$1 ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/ {2,}/g, ' ')
  return { text: text.trim(), carry: nextCarry }
}

/** Interim preview: nothing is held back. */
export function previewDictation(raw: string): string {
  return convertDictation(raw, '', { flush: true }).text
}

/** Append a chunk without breaking the user's own spacing. */
export function appendDictatedText(previous: string, addition: string): string {
  const chunk = addition.replace(/^ +/, '').replace(/ +$/, '')
  if (!chunk) return previous
  if (!previous) return chunk
  if (chunk.startsWith('\n') || /\n$/.test(previous)) return previous + chunk
  if (new RegExp(`^[${CLOSERS}]`).test(chunk)) return previous + chunk
  if (/[ \u200c(«]$/.test(previous)) return previous + chunk
  return `${previous} ${chunk}`
}
