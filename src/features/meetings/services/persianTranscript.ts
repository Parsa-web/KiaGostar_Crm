/**
 * Persian post-processing for speech-to-text output.
 *
 * The Web Speech API returns raw `fa-IR` text that mixes Arabic and Persian
 * letter forms, drops half-spaces (ZWNJ) and spaces punctuation the Latin way.
 * Everything here is deliberately conservative: a rule is only allowed in when
 * it cannot change the meaning of a sentence. Anything ambiguous is left for
 * the human editing the minutes.
 */

const ZWNJ = '\u200c'

/**
 * Every character-level fix in one pass.
 *
 * This runs on the live path, so it is a single regex with a lookup instead of
 * the seven sequential `replace` calls it started as: each extra pass is a full
 * re-scan and re-allocation of the string on every audio result.
 */
// The combining-mark range is intentional: Arabic harakat must be removed from ASR output.
// eslint-disable-next-line no-misleading-character-class
const FOLD_PATTERN = /[\u064A\u0649\u0643\u0629\u0640\u064B-\u0652\u0670\u200e\u200f\u0660-\u0669]/g

const foldCharacter = (character: string): string => {
  switch (character) {
    case '\u064A': // ي
    case '\u0649': // ى
      return 'ی'
    case '\u0643': // ك
      return 'ک'
    case '\u0629': // ة
      return 'ه'
    default: {
      const code = character.charCodeAt(0)
      // Arabic-Indic digits ٠-٩ -> Persian ۰-۹
      if (code >= 0x0660 && code <= 0x0669) return String.fromCharCode(code + 0x06f0 - 0x0660)
      // Tatweel, harakat and stray bidi marks are decoration: drop them.
      return ''
    }
  }
}

/**
 * Whole-word corrections. Only unambiguous, high-frequency cases: each entry is
 * a spelling/spacing fix, never a guess at a different word.
 * Extend by appending — the key is matched as a whole word.
 */
export const PERSIAN_CORRECTIONS: Readonly<Record<string, string>> = {
  'صورت جلسه': `صورت${ZWNJ}جلسه`,
  'صورتجلسه': `صورت${ZWNJ}جلسه`,
  'دستورکار': 'دستور کار',
  'هم چنین': `هم${ZWNJ}چنین`,
  'به طور': `به${ZWNJ}طور`,
  'به عنوان': `به${ZWNJ}عنوان`,
  'در باره': 'درباره',
  'ان شاءالله': 'ان‌شاءالله',
  'می باشد': `می${ZWNJ}باشد`,
  'می شود': `می${ZWNJ}شود`,
  'می گردد': `می${ZWNJ}گردد`,
  'می کند': `می${ZWNJ}کند`,
  'نمی شود': `نمی${ZWNJ}شود`,
  'بايد': 'باید',
  'مسئولين': 'مسئولین',
}

/** Words that are genuine standalone words, so the "…ها" plural rule must skip them. */
const PLURAL_EXCEPTIONS = new Set(['تنها', 'رها', 'بها', 'شها'])

const applyFolding = (value: string): string => value.replace(FOLD_PATTERN, foldCharacter)

/** Collapse repeats, drop the space before punctuation and guarantee one after it. */
const normalizeSpacing = (value: string): string => value
  .replace(/[ \t\u00a0]+/g, ' ')
  .replace(/\s+([،؛,.!?؟:])/g, '$1')
  .replace(/([،؛,؟?!:])(?=[^\s])/g, '$1 ')
  .replace(/\s+\n/g, '\n')
  .trim()

/**
 * Half-space rules. Restricted to the three patterns Persian ASR gets wrong
 * almost every time — the verb prefixes and the plural suffix — because each
 * one is a spacing fix with a single correct answer.
 */
const applyHalfSpaces = (value: string): string => value
  .replace(/(^|\s)(ن?می)\s+(?=[\u0600-\u06FF])/g, `$1$2${ZWNJ}`)
  .replace(/([\u0600-\u06FF]{2,})\s+(ها(?:ی|یی)?)(?=\s|$|[،؛,.!?؟:])/g, (match, stem: string, suffix: string) =>
    PLURAL_EXCEPTIONS.has(`${stem}${suffix}`) ? match : `${stem}${ZWNJ}${suffix}`)
  .replace(new RegExp(`${ZWNJ}{2,}`, 'g'), ZWNJ)

/**
 * The dictionary compiled once into a single alternation.
 *
 * Building one `RegExp` per entry per call meant recompiling the whole table on
 * every finalised phrase; longer keys are sorted first so that, for example,
 * "صورت جلسه" wins over any prefix of it.
 */
const CORRECTION_PATTERN = (() => {
  const keys = Object.keys(PERSIAN_CORRECTIONS).sort((a, b) => b.length - a.length)
  if (!keys.length) return null
  const alternation = keys.map((key) => key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
  return new RegExp(`(^|[\\s،؛.!?؟:])(${alternation})(?=$|[\\s،؛.!?؟:])`, 'g')
})()

const applyCorrections = (value: string): string => CORRECTION_PATTERN === null ? value
  : value.replace(CORRECTION_PATTERN, (_match, lead: string, word: string) =>
    `${lead}${PERSIAN_CORRECTIONS[word] ?? word}`)

/**
 * The only transformation allowed on the live path.
 *
 * Interim text is rewritten by the engine on every audio frame and is thrown
 * away the moment the phrase finalises, so it gets letter folding and a space
 * collapse and nothing else — no dictionary, no half-spaces, no punctuation
 * rules. Those would burn CPU on text that is about to be replaced anyway, and
 * they are what made the live caption lag behind the speaker.
 */
export const foldPersianText = (value: string): string =>
  applyFolding(value).replace(/[ \t\u00a0]{2,}/g, ' ')

/**
 * Full pass, applied once to each finalised chunk.
 * Never call this on already-processed text: the result is idempotent but the
 * work is wasted, and re-running it per render is what caused duplicated text.
 */
export const normalizePersianTranscript = (value: string): string => {
  if (!value.trim()) return ''
  return normalizeSpacing(applyCorrections(applyHalfSpaces(normalizeSpacing(applyFolding(value)))))
}
