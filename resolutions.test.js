/**
 * The six Community Poll resolutions (LO 3rd Ed., Appendix XVI).
 *
 * These were adopted by vote in Lannang group chats and the manual calls them
 * "legally binding". They are the orthography's own conformance suite, so
 * they get their own file.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { placeTone, toneLastSyllable, toRecommended, toConvenience,
         insertWithTone, isBoundary } from './lo-engine.js';

const nfc = (s) => s.normalize('NFC');
const type = (seq) => {
  let buf = '', armed = null;
  for (const s of seq) {
    if (s.startsWith('@')) { armed = s.slice(1); buf = toneLastSyllable(buf, armed); }
    else { buf = insertWithTone(buf, s, armed); if (isBoundary(s)) armed = null; }
  }
  return nfc(buf);
};

describe('Resolution 1 — nasalization (26-16)', () => {
  test('superscript ⁿ is the formal form', () =>
    assert.equal(nfc(placeTone('siaⁿ', 'mid')), nfc('siāⁿ')));
  test('nn is the fallback and normalizes back', () =>
    assert.equal(nfc(toRecommended('siānn').text), nfc('siāⁿ')));
  test('and converts to the fallback on demand', () =>
    assert.equal(nfc(toConvenience('siāⁿ').text), nfc('siānn')));
});

describe('Resolution 3 — open o (14-4-3-1-1)', () => {
  test("closed o takes no apostrophe", () =>
    assert.equal(nfc(placeTone('bo', 'rising')), nfc('bó')));
  test("open o in formal contexts keeps it", () =>
    assert.equal(nfc(placeTone("po'", 'rising')), nfc("pó'")));
  // the resolution's own example carries apostrophe AND nasalization
  test("pó'-khô'ⁿ — apostrophe and ⁿ on one syllable", () =>
    assert.equal(nfc(placeTone("kho'ⁿ", 'high')), nfc("khô'ⁿ")));
});

describe('Resolution 5 — syllabic nasals (15-11-3-3-2)', () => {
  test('tńg — tone mark on the nasal', () =>
    assert.equal(nfc(placeTone('tng', 'rising')), nfc('tńg')));
  test('teúng is the informal alternate', () =>
    assert.equal(nfc(toConvenience('tńg').text), nfc('teúng')));
  test('and normalizes back', () =>
    assert.equal(nfc(toRecommended('teúng').text), nfc('tńg')));
});

describe('Resolution 6 — neutral tones (13-9)', () => {
  test("'--' marks the first neutral syllable", () =>
    assert.equal(type(['b','e','@falling','-','p','a','@neutral']), nfc('bè--pa')));

  // The rule this file was written for: subsequent neutral syllables in the
  // same sequence take a SINGLE dash. The engine emitted 'bè--pa--la'.
  test("subsequent neutral syllables take a single '-'", () =>
    assert.equal(type(['b','e','@falling','-','p','a','@neutral','-','l','a','@neutral']),
      nfc('bè--pa-la')));
  test("thǹg--khi-lai", () =>
    assert.equal(type(['t','h','n','g','@falling','-','k','h','i','@neutral','-','l','a','i','@neutral']),
      nfc('thǹg--khi-lai')));
  test('a new word starts the sequence over', () =>
    assert.equal(type(['t','a','@mid','-','k','h','i','@neutral',' ','b','e','@falling','-','p','a','@neutral']),
      nfc('tā--khi bè--pa')));
});
