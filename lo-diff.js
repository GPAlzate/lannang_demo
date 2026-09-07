/**
 * LO-aware transcript comparison.
 *
 * Generic WER treats 'khuâⁿ' vs 'khuann' as a plain substitution, which hides
 * the two error types that actually matter for Lánnang-uè:
 *   • tone errors      — right syllable, wrong or missing tone mark
 *   • code-switch errors — the model resolved a Tagalog/English word into the
 *                          wrong language entirely
 * Those are separated out here so the comparison says something useful.
 */
import { stripTones, toRecommended } from './lo-engine.js';

const nfc = (s) => s.normalize('NFC');
const norm = (t) => t.toLowerCase().replace(/[.,!?;:"“”]/g, '');
const tok = (s) => s.trim().split(/\s+/).filter(Boolean);

/** Same letters, different marks → the model heard the syllable but not the tone. */
export function isToneError(a, b) {
  return nfc(stripTones(norm(a))) === nfc(stripTones(norm(b))) && nfc(norm(a)) !== nfc(norm(b));
}

/** The ⁿ/nn fallback is a spelling variant, not an error (§VIII). */
export function isSpellingVariant(a, b) {
  return nfc(toRecommended(norm(a)).text) === nfc(toRecommended(norm(b)).text);
}

/**
 * Levenshtein alignment over tokens, then classify each mismatch.
 * Returns rows the UI can render side by side.
 */
export function align(reference, hypothesis, lexicon = new Map()) {
  const R = tok(reference), H = tok(hypothesis);
  const d = Array.from({ length: R.length + 1 }, (_, i) =>
    Array.from({ length: H.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));

  for (let i = 1; i <= R.length; i++)
    for (let j = 1; j <= H.length; j++)
      d[i][j] = nfc(norm(R[i - 1])) === nfc(norm(H[j - 1]))
        ? d[i - 1][j - 1]
        : 1 + Math.min(d[i - 1][j - 1], d[i - 1][j], d[i][j - 1]);

  const rows = [];
  let i = R.length, j = H.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && nfc(norm(R[i - 1])) === nfc(norm(H[j - 1]))) {
      rows.push({ type: 'ok', ref: R[--i], hyp: H[--j] });
    } else if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + 1) {
      const ref = R[--i], hyp = H[--j];
      let type = 'sub';
      if (isSpellingVariant(ref, hyp)) type = 'variant';
      else if (isToneError(ref, hyp)) type = 'tone';
      else {
        const lr = lexicon.get(nfc(norm(ref))), lh = lexicon.get(nfc(norm(hyp)));
        if (lr && lh && lr !== lh) type = 'codeswitch';
      }
      rows.push({ type, ref, hyp });
    } else if (i > 0 && (j === 0 || d[i][j] === d[i - 1][j] + 1)) {
      rows.push({ type: 'del', ref: R[--i], hyp: null });
    } else {
      rows.push({ type: 'ins', ref: null, hyp: H[--j] });
    }
  }
  rows.reverse();

  const count = (t) => rows.filter((r) => r.type === t).length;
  const errors = rows.length - count('ok') - count('variant');
  return {
    rows,
    stats: {
      tokens: R.length,
      correct: count('ok'),
      variant: count('variant'),
      tone: count('tone'),
      codeswitch: count('codeswitch'),
      sub: count('sub'),
      ins: count('ins'),
      del: count('del'),
      wer: R.length ? errors / R.length : 0,
    },
  };
}
