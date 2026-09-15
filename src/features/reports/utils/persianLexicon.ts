/**
 * Domain vocabulary pass for dictated Persian text.
 *
 * The Web Speech recognizer is trained on general Persian, so it reliably
 * mishears the administrative vocabulary this CRM is full of («مصوبه»,
 * «کارتابل», «کیاگستر») and writes common Persian homophones with the
 * wrong letter («گذارش» instead of «گزارش»). Punctuation and grammar live in
 * persianDictation.ts; only word-level vocabulary belongs here, so the table
 * can grow without touching the converter.
 *
 * Rules for adding entries: the key must be a full word (never a fragment) and
 * must not be a legitimate Persian word with a different meaning, otherwise
 * correct dictation would be corrupted.
 */
const HALF_SPACE = '\u200c'

/** Single-word corrections, matched on whole words only. */
const WORD_FIXES: Readonly<Record<string, string>> = {
  'گذارش': 'گزارش',
  'گذارشات': 'گزارش‌ها',
  'گزارشات': 'گزارش‌ها',
  'مصوبه‌ها': 'مصوبات',
  'مسیول': 'مسئول',
  'مسوول': 'مسئول',
  'مسیولیت': 'مسئولیت',
  'جلسه‌ها': 'جلسات',
  'اقداماتها': 'اقدامات',
  'ملاحطات': 'ملاحظات',
  'حوزهٔ': 'حوزه',
  'بازدهی': 'بازده',
  'درخاستها': 'درخواست‌ها',
  'درخاست': 'درخواست',
  'پیگیری': 'پیگیری',
  'کارتابیل': 'کارتابل',
  'کیاگستر': 'کیاگستر',
}

/** Multi-word phrases the recognizer splits or spells incorrectly. */
const PHRASE_FIXES: readonly (readonly [RegExp, string])[] = [
  [/کیا\s+گستر/g, 'کیاگستر'],
  [/صورت\s+جلسه/g, 'صورت' + HALF_SPACE + 'جلسه'],
  [/هیئت\s+مدیره/g, 'هیئت مدیره'],
  [/برنامه\s+زمانبندی/g, 'برنامهٔ زمان‌بندی'],
  [/پیش\s+نویس/g, 'پیش' + HALF_SPACE + 'نویس'],
]

/**
 * Apply the vocabulary pass and drop the duplicated adjacent word the
 * recognizer emits when a session restarts mid-sentence («گزارش گزارش»).
 */
export function applyPersianLexicon(input: string): string {
  if (!input) return input
  let text = input
    .split(/(\s+)/)
    .map((part) => (/\s/.test(part) ? part : WORD_FIXES[part] ?? part))
    .join('')
  for (const [pattern, replacement] of PHRASE_FIXES) text = text.replace(pattern, replacement)
  return text.replace(/(^|\s)([\u0600-\u06FF\u200c]{3,})\s+\2(?=\s|$)/g, '$1$2')
}
