// Quick sanity check that the pastel theme + polish layers made it into the bundle.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = 'dist/assets';
const cssFile = readdirSync(dir).find((f) => f.endsWith('.css'));
const css = readFileSync(join(dir, cssFile), 'utf8');

const checks = [
  ['pastel primary token', '#17886b'],  
  ['brand gradient token', '--gradient-brand'],
  ['page gradient token', '--gradient-page'],
  ['rounded radius token', '--radius-lg:1rem'],
  ['ui-button repaint', '.ui-button--primary'],
  ['sticky-header bugfix', 'overflow-x:clip'],
  ['checkbox size bugfix', 'accent-color'],
  ['sticky toolbar fix', '.ui-toolbar--sticky'],
  ['kpi double-border fix', 'border-block-start-width:1px'],
  ['forced-colors block', 'forced-colors'],
  ['print block', '@media print'],
];

let failed = 0;
for (const [label, needle] of checks) {
  const ok = css.includes(needle);
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
}

console.log(`\n${cssFile} — ${(css.length / 1024).toFixed(1)} kB`);
console.log(failed === 0 ? 'All theme checks passed.' : `${failed} check(s) failed.`);
process.exit(failed === 0 ? 0 : 1);
