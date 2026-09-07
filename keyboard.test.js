/**
 * Keyboard coverage.
 *
 * The engine can place a tone on an initialism (§IX(e), 'TV̀') — but that is
 * worthless if the keyboard has no shift key to type 'TV' with. This test
 * closes that gap: every LO form printed in the manual must be reachable from
 * the on-screen key set, or the keyboard is incomplete.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TONES } from './lo-engine.js';
import { SAMPLE_FORMAL, SAMPLE_CONVENIENCE } from './lo-fixtures.js';

// Mirrors the keys defined in index.html.
const LETTERS  = [...'qwertyuiopasdfghjklzxcvbnm'];
const SHIFTED  = LETTERS.map((c) => c.toUpperCase());
const SPECIALS = ['ⁿ', "'", '-', ',', '.', ' '];
const MARKS    = TONES.map((t) => t.mark).filter(Boolean);
const EMITTABLE = new Set([...LETTERS, ...SHIFTED, ...SPECIALS, ...MARKS]);

const corpus = JSON.parse(readFileSync(new URL('./corpus.json', import.meta.url), 'utf8')).entries;

const forms = new Set();
for (const e of corpus) { forms.add(e.lo); (e.variants ?? []).forEach((v) => forms.add(v)); }
for (const w of (SAMPLE_FORMAL + ' ' + SAMPLE_CONVENIENCE).split(/\s+/)) forms.add(w);

const untypeable = (f) => [...f.normalize('NFD')].filter((c) => !EMITTABLE.has(c));

describe('keyboard covers every form the manual prints', () => {
  test(`all ${forms.size} attested forms are typeable`, () => {
    const blocked = [...forms]
      .map((f) => [f, untypeable(f)])
      .filter(([, miss]) => miss.length);
    assert.deepEqual(blocked.map(([f]) => f), [],
      `unreachable: ${blocked.map(([f, m]) => `${f} (${m.map((c) => 'U+' + c.codePointAt(0).toString(16)).join(',')})`).join('; ')}`);
  });

  // Each of these was genuinely unreachable before the shift/hyphen/punctuation keys.
  for (const [f, why] of [
    ['TV̀',        '§IX(e) initialism needs capitals'],
    ['KKB̀',       '§IX(e) initialism needs capitals'],
    ['Bí-kôk',     '§XV proper noun: capital + hyphen'],
    ['á-tsî',      'syllable-boundary hyphen'],
    ['tsaû--khi',  '§X neutral tone: double hyphen'],
    ['khùn--khi-be', '§X consecutive neutral tones'],
    ['siūⁿ',      '§VIII nasalization'],
    ["hō'",        '§III open o'],
    ['hn̄g',       '§IX(c) mark on a syllabic nasal'],
  ]) {
    test(`${f} — ${why}`, () => assert.deepEqual(untypeable(f), []));
  }
});
