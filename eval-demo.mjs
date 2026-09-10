// Scores a machine transcript against a reference the way Lánnang-uè needs:
// tone errors and code-switch errors separated from sanctioned spelling variants.
// Waiting on a model; the metric is not.
import { align } from './lo-diff.js';

const reference  = process.argv[2] ?? "Īn siuⁿ bê ho' hî-ge jackêt";
const hypothesis = process.argv[3] ?? "In siunn be ho hi-ge dyaket";
const lang = new Map([['jackêt', 'English'], ['dyaket', 'Tagalog']]);

const { rows, stats } = align(reference, hypothesis, lang);
const label = { ok: 'match', variant: 'same word', tone: 'tone missed',
                codeswitch: 'wrong language', sub: 'different', ins: 'added', del: 'dropped' };

console.log(`\nreference   ${reference}\nmodel       ${hypothesis}\n`);
for (const r of rows) {
  console.log(`  ${label[r.type].padEnd(15)} ${(r.ref ?? '—').padEnd(10)} ${r.hyp ?? '—'}`);
}
console.log(`\n  heard correctly  ${stats.correct + stats.variant}/${stats.tokens}`);
console.log(`  tones missed     ${stats.tone}`);
console.log(`  wrong language   ${stats.codeswitch}`);
console.log(`  exact-match WER  ${(stats.wer * 100).toFixed(0)}%  <- hides all of the above\n`);
