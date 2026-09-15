/**
 * Persian dictation post-processing.
 *
 * Web Speech returns raw, unpunctuated Persian that mixes Arabic code points,
 * drops half-spaces and spells punctuation out loud. The converter works on
 * WORDS, not regex boundaries: a chunk can start or end in the middle of a
 * spoken command ("خط" arrives now, "جدید" in the next result), so an
 * unfinished command prefix is carried over instead of being written out as
 * literal text. That is what made commands land as text at random before.
 */
const HALF_SPACE = '\u200c'
const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'] as const

export type DictationCommand = 'deleteWord' | 'deleteSentence'

interface PunctuationToken { kind: 'punct'; value: string }
interface BreakToken { kind: 'break'; value: string }
interface CommandToken { kind: 'command'; value: DictationCommand }
type SpokenToken = PunctuationToken | BreakToken | CommandToken

/** Spoken punctuation. "درصد" is deliberately absent: it is an ordinary word. */
const SPOKEN: Readonly<Record<string, SpokenToken>> = {
  'نقطه': { kind: 'punct', value: '.' },
  'نقطه ویرگول': { kind: 'punct', value: '؛' },
  'ویرگول': { kind: 'punct', value: '،' },
  'کاما': { kind: 'punct', value: '،' },
  'کومه': { kind: 'punct', value: '،' },
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
  'حذف کلمه': { kind: 'command', value: 'deleteWord' },
  'حذف جمله': { kind: 'command', value: 'deleteSentence' },
}

/** First words of multi-word commands; held back at the end of a chunk. */
const COMMAND_PREFIXES = new Set(['نقطه', 'دو', 'علامت', 'پرانتز', 'گیومه', 'خط', 'سطر', 'سر', 'پاراگراف', 'بند', 'حذف'])

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
    // Recognizers sometimes glue command words with a ZWNJ.
    .replace(/\u0646\u0642\u0637\u0647\u200c\u0648\u06cc\u0631\u06af\u0648\u0644/g, '\u0646\u0642\u0637\u0647 \u0648\u06cc\u0631\u06af\u0648\u0644')
    .replace(/\u0633\u0631\u200c\u062e\u0637/g, '\u0633\u0631\u062e\u0637')
}

export interface ConvertDictationResult {
  /** Ready-to-insert text; may be empty when the chunk was only a command. */
  text: string
  /** Unfinished command prefix to pass into the next call. */
  carry: string
  /** Editing commands the user dictated, in spoken order. */
  commands: DictationCommand[]
}

export interface ConvertDictationOptions {
  /** Latin -> Persian digits (default: true). */
  persianDigits?: boolean
  /** Interim text: never hold a word back, show everything. */
  flush?: boolean
}

/**
 * Convert one recognition chunk into Persian text plus commands.
 * `carry` is the prefix returned by the previous call.
 */
export function convertDictation(raw: string, carry = '', options: ConvertDictationOptions = {}): ConvertDictationResult {
  const { persianDigits = true, flush = false } = options
  const source = foldCharacters(`${carry} ${raw}`).replace(/[\t\r]+/g, ' ')
  const words = source.split(/\s+/).filter(Boolean)
  const commands: DictationCommand[] = []
  let output = ''
  let nextCarry = ''

  const appendWord = (word: string) => {
    if (!output || /[\n(«]$/.test(output)) output += word
    else output += ` ${word}`
  }

  for (let index = 0; index < words.length; index += 1) {
    const word = words[index]
    const pair = index + 1 < words.length ? `${word} ${words[index + 1]}` : ''
    const token = (pair && SPOKEN[pair]) || SPOKEN[word]
    const consumed = pair && SPOKEN[pair] ? 2 : 1

    // A command prefix at the very end of a chunk waits for the next chunk.
    if (!token && !flush && index === words.length - 1 && COMMAND_PREFIXES.has(word)) {
      nextCarry = word
      break
    }
    if (token && !SPOKEN[pair] && !flush && index === words.length - 1 && COMMAND_PREFIXES.has(word)) {
      nextCarry = word
      break
    }

    if (!token) {
      appendWord(word)
      continue
    }
    if (token.kind === 'punct') {
      output = output.replace(/ +$/, '') + token.value
    } else if (token.kind === 'break') {
      output = output.replace(/[ \n]+$/, '') + token.value
    } else {
      commands.push(token.value)
    }
    index += consumed - 1
  }

  let text = output
  for (const [pattern, replacement] of HALF_SPACE_RULES) text = text.replace(pattern, replacement)
  text = text
    .replace(/ +([.،؛:؟!)»])/g, '$1')
    .replace(/([(«]) +/g, '$1')
    .replace(/([.،؛:؟!])(?=[^\s\n.،؛:؟!)»])/g, '$1 ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/ {2,}/g, ' ')
  if (persianDigits) text = text.replace(/[0-9]/g, (digit) => PERSIAN_DIGITS[Number(digit)])
  return { text: text.trim(), carry: nextCarry, commands }
}

/** Interim preview: nothing is held back and no command is executed. */
export function previewDictation(raw: string): string {
  return convertDictation(raw, '', { flush: true }).text
}

/** Append a finalised chunk without breaking the user's own spacing. */
export function appendDictatedText(previous: string, addition: string): string {
  const chunk = addition.replace(/^ +/, '').replace(/ +$/, '')
  if (!chunk) return previous
  if (!previous) return chunk
  if (chunk.startsWith('\n') || /\n$/.test(previous)) return previous + chunk
  if (/^[.،؛:؟!)»]/.test(chunk)) return previous + chunk
  if (/[ \u200c(«]$/.test(previous)) return previous + chunk
  return previous + ' ' + chunk
}

/** «حذف کلمه» */
export function deleteLastWord(text: string): string {
  return text.replace(/[ \n]*[^\s]+[ \n]*$/, '').replace(/ +$/, '')
}

/** «حذف جمله» */
export function deleteLastSentence(text: string): string {
  const trimmed = text.replace(/[\s]+$/, '')
  const boundary = Math.max(trimmed.lastIndexOf('.'), trimmed.lastIndexOf('؟'), trimmed.lastIndexOf('!'), trimmed.lastIndexOf('\n'))
  return boundary <= 0 ? '' : trimmed.slice(0, boundary + 1)
}
