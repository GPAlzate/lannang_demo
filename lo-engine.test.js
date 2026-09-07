import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { placeTone, applyNumeric, toConvenience, toRecommended, toneCarrier, toneLastSyllable, fromAscii, insertWithTone, isBoundary, predict,
         isSyllabicNasal, isExpandedSyllabicNasal, stripTones } from './lo-engine.js';
import { PLACEMENT, FALLBACK_PAIRS, SAMPLE_FORMAL, SAMPLE_CONVENIENCE } from './lo-fixtures.js';

const nfc = (s) => s.normalize('NFC');

describe('§IX — tone mark placement', () => {
  for (const [input, tone, expected, cite] of PLACEMENT) {
    test(`${cite}: ${input} + ${tone} → ${expected}`, () => {
      assert.equal(nfc(placeTone(input, tone)), nfc(expected));
    });
  }
});

describe('numeric tone input', () => {
  test('niau5 → niaū', () => assert.equal(nfc(applyNumeric('niau5')), nfc('niaū')));
  test('png2 → pǹg',  () => assert.equal(nfc(applyNumeric('png2')),  nfc('pǹg')));
  test('bare token passes through', () => assert.equal(applyNumeric('jackêt'), 'jackêt'));
});

describe('§III/§VII/§VIII — recommended → convenience', () => {
  for (const [formal, convenience, cite] of FALLBACK_PAIRS) {
    test(`${cite}: ${formal} → ${convenience}`, () => {
      assert.equal(nfc(toConvenience(formal).text), nfc(convenience));
    });
  }
});

describe('§III/§VII/§VIII — convenience → recommended', () => {
  // open-o is excluded: it is not recoverable by rule (see the asymmetry test)
  for (const [formal, convenience, cite] of FALLBACK_PAIRS.filter(p => !p[2].includes('open o'))) {
    test(`${cite}: ${convenience} → ${formal}`, () => {
      assert.equal(nfc(toRecommended(convenience).text), nfc(formal));
    });
  }
});

describe('§XIV — the spec’s own parallel sample text', () => {
  test('formal → convenience reproduces the printed convenience text exactly', () => {
    assert.equal(nfc(toConvenience(SAMPLE_FORMAL).text), nfc(SAMPLE_CONVENIENCE));
  });

  test('convenience → formal reproduces the printed formal text exactly', () => {
    assert.equal(nfc(toRecommended(SAMPLE_CONVENIENCE).text), nfc(SAMPLE_FORMAL));
  });
});

describe('regression guards — words that must NOT be rewritten', () => {
  test("'neung' is not a syllabic-nasal fallback (nasal onset)", () => {
    assert.equal(isExpandedSyllabicNasal('neung'), false);
    assert.equal(toRecommended('neung').text, 'neung');
  });
  test("'tshieung' is not a syllabic-nasal fallback (vowel in onset)", () => {
    assert.equal(isExpandedSyllabicNasal('tshieung'), false);
    assert.equal(toRecommended('tshieung').text, 'tshieung');
  });
  test("medial 'nn' is a real geminate, not the ⁿ fallback (§I.A innèr)", () => {
    assert.equal(toRecommended('innèr').text, 'innèr');
  });
});

describe('§III — the asymmetry the demo turns on', () => {
  test('dropping the open-o apostrophe is a pure rule', () => {
    assert.equal(nfc(toConvenience("tò'").text), nfc('tò'));
  });
  test('restoring it is not — tò is genuinely ambiguous', () => {
    const { ambiguous } = toRecommended('tò');
    assert.equal(ambiguous.length, 1);
    assert.deepEqual(ambiguous[0].candidates.map((c) => c.gloss), ['left', 'degree']);
  });
  test('and is reported, never guessed', () => {
    assert.equal(toRecommended('tò').text, 'tò');
  });
});

describe('§IX — carrier selection is explainable', () => {
  test('reports which clause fired', () => {
    assert.match(toneCarrier('kau').rule,    /rightmost vowel/);
    assert.match(toneCarrier('hng').rule,    /syllabic nasal/);
    assert.match(toneCarrier('cy').rule,     /y/);
    assert.match(toneCarrier('TV').rule,     /acronym/);
  });
});

describe('toning the last syllable must not erase earlier ones', () => {
  const type = (word, ...tones) => tones.reduce(
    (acc, [add, t]) => nfc(toneLastSyllable(acc + add, t)), '');

  test("Bi→rising, -kok→high gives Bí-kôk", () => {
    assert.equal(type('', ['Bi', 'rising'], ['-kok', 'high']), nfc('Bí-kôk'));
  });
  test("a→rising, -tsi→high gives á-tsî", () => {
    assert.equal(type('', ['a', 'rising'], ['-tsi', 'high']), nfc('á-tsî'));
  });
  test('three syllables all keep their tones', () => {
    assert.equal(type('', ['tshiam', 'rising'], ['-ma', 'high']), nfc('tshiám-mâ'));
  });
  test('§X neutral tone attaches with -- to the previous syllable', () => {
    assert.equal(type('', ['tsau', 'high'], ['-khi', 'neutral']), nfc('tsaû--khi'));
  });
  test('a single syllable still behaves like placeTone', () => {
    assert.equal(nfc(toneLastSyllable('niau', 'mid')), nfc('niaū'));
  });
});

describe('ASCII input mode — the VNI path, not the Telex path', () => {
  // Telex-style letter keys are unusable here: measured against the manual's
  // wordlist, 8 of 10 candidate tone letters occur syllable-finally in LO
  // (malakâs, appeàr, chêf, pillòw, quârtz). Digits occur in zero forms.
  for (const [ascii, lo] of [
    ['niau5',    'niaū'],      // plain vowel
    ['siunn5',   'siūⁿ'],     // §VIII nn fallback folded in
    ['peung2',   'pǹg'],       // §VII eu fallback folded in
    ['heung5',   'hn̄g'],      // §IX(d) eu fallback
    ['Bi3-kok1', 'Bí-kôk'],    // multi-syllable, per-syllable tones
    ['a3-tsi1',  'á-tsî'],
    ['khuann1',  'khuâⁿ'],
    ['malakas1', 'malakâs'],   // Tagalog-derived, ends in 's'
    ['tapos1',   'tapôs'],     // Tagalog-derived, ends in 's'
    ['jacket1',  'jackêt'],    // English-derived
    ['TV2',      'TV̀'],        // §IX(e) initialism
  ]) {
    test(`${ascii} → ${lo}`, () => assert.equal(nfc(fromAscii(ascii)), nfc(lo)));
  }

  test('a whole line round-trips', () => {
    assert.equal(nfc(fromAscii('Bi3-kok1 jacket1')), nfc('Bí-kôk jackêt'));
  });
});

describe('live composition — tone entry is order-independent within a syllable', () => {
  // Simulates the keyboard: letters arrive one at a time, a tone may be armed
  // at any point, and the mark must end up where §IX puts it either way.
  const type = (seq) => {
    let buf = '', armed = null;
    for (const step of seq) {
      if (step.startsWith('@')) { armed = step.slice(1); buf = toneLastSyllable(buf, armed); }
      else { buf = insertWithTone(buf, step, armed); if (isBoundary(step)) armed = null; }
    }
    return nfc(buf);
  };

  test('tone tapped early:  s i [mid] u n n', () =>
    assert.equal(type(['s', 'i', '@mid', 'u', 'n', 'n']), nfc('siūnn')));
  test('tone tapped middle: s i u [mid] n n', () =>
    assert.equal(type(['s', 'i', 'u', '@mid', 'n', 'n']), nfc('siūnn')));
  test('tone tapped last:   s i u n n [mid]', () =>
    assert.equal(type(['s', 'i', 'u', 'n', 'n', '@mid']), nfc('siūnn')));

  test('the mark migrates onto a later vowel: k a [high] u', () =>
    assert.equal(type(['k', 'a', '@high', 'u']), nfc('kaû')));
  test('ⁿ typed after the tone keeps the mark on the vowel', () =>
    assert.equal(type(['s', 'u', 'a', '@mid', 'ⁿ']), nfc('suāⁿ')));

  test('a boundary disarms the tone so the next syllable is independent', () =>
    assert.equal(type(['B', 'i', '@rising', '-', 'k', 'o', 'k', '@high']), nfc('Bí-kôk')));
  test('a space disarms too', () =>
    assert.equal(type(['t', 'e', '@rising', ' ', 't', 'o']), nfc('té to')));
});

describe('toning a later word must not disturb earlier ones', () => {
  // Found by building the actual keyboard: toneLastSyllable split on hyphens
  // but not whitespace, so 'siūⁿ jacke' + high produced 'siuⁿ jackê'.
  test('siūⁿ jacke + high → siūⁿ jackê', () => {
    assert.equal(nfc(toneLastSyllable('siūⁿ jacke', 'high')), nfc('siūⁿ jackê'));
  });
  test('a full code-switched phrase keeps every tone', () => {
    const type = (seq) => {
      let buf = '', armed = null;
      for (const s of seq) {
        if (s.startsWith('@')) { armed = s.slice(1); buf = toneLastSyllable(buf, armed); }
        else { buf = insertWithTone(buf, s, armed); if (isBoundary(s)) armed = null; }
      }
      return nfc(buf);
    };
    assert.equal(
      type(['s','i','@mid','u','ⁿ',' ','j','a','c','k','e','@high','t']),
      nfc('siūⁿ jackêt'));
  });
});

describe('prediction', () => {
  const LEX = JSON.parse(
    readFileSync(new URL('./corpus.json', import.meta.url), 'utf8')).entries;
  const los = (q, n) => predict(q, LEX, n).map((e) => nfc(e.lo));

  test('bare letters find the toned headword', () => {
    assert.ok(los('siu').includes(nfc('siūⁿ')));
  });
  test('a fallback spelling finds the recommended form (§VIII)', () => {
    assert.ok(los('siunn').includes(nfc('siūⁿ')));
  });
  test('code-switched words are predicted too', () => {
    assert.ok(los('jack').includes(nfc('jackêt')));
    assert.ok(los('malak').includes(nfc('malakâs')));
  });

  // The payoff: §III open-o is not decidable by rule, so the engine reports it
  // ambiguous. Prediction is where the user resolves it.
  test('the §III minimal pair is offered as two distinguishable choices', () => {
    const hits = predict('to', LEX, 4);
    const pair = hits.filter((e) => ['left', 'degree'].includes(e.gloss));
    assert.equal(pair.length, 2);
    assert.deepEqual(pair.map((e) => nfc(e.lo)).sort(), [nfc('tò'), nfc("tò'")].sort());
  });
  test('and so is bó / bô’', () => {
    const g = predict('bo', LEX, 4).filter((e) => ['not', 'wife'].includes(e.gloss));
    assert.deepEqual(g.map((e) => nfc(e.lo)).sort(), [nfc('bó'), nfc("bô'")].sort());
  });

  test('empty input predicts nothing', () => assert.deepEqual(predict('', LEX), []));
});

describe('ASCII mode: the tone digit may sit anywhere in the syllable', () => {
  test('trailing digit', () => assert.equal(nfc(fromAscii('siunn5')), nfc('siūⁿ')));
  test('digit after the vowel', () => assert.equal(nfc(fromAscii('siu5nn')), nfc('siūⁿ')));
  test('both spellings agree', () =>
    assert.equal(nfc(fromAscii('khua1nn')), nfc(fromAscii('khuann1'))));

  // The display must never go backwards while typing: each keystroke may only
  // add to what is shown. Matching only a trailing digit broke this --
  // 'siu5' rendered 'siū', then 'siu5n' fell back to the literal 'siu5n'.
  test('the rendering is monotonic keystroke by keystroke', () => {
    const seen = [];
    let acc = '';
    for (const ch of 'siu5nn') { acc += ch; seen.push(nfc(fromAscii(acc))); }
    assert.deepEqual(seen, ['s', 'si', 'siu', nfc('siū'), nfc('siūn'), nfc('siūⁿ')]);
    for (const s of seen) assert.ok(!/[0-5]/.test(s), `digit leaked into display: ${s}`);
  });
});

describe('§IX(c) — "if syllabic nasal" is load-bearing', () => {
  // A nasal in ONSET position is not the nucleus and must not take the mark.
  // Treating every m/n as syllabic produced 'm̂yth' for 'mŷth'.
  test('onset m does not steal the mark from the nucleus y', () => {
    assert.equal(nfc(placeTone('myth', 'high')), nfc('mŷth'));
    assert.match(toneCarrier('myth').rule, /y/);
  });
  test('final m IS the nucleus in rhythm', () => {
    assert.equal(nfc(placeTone('rhythm', 'falling')), nfc('rhythm̀'));
    assert.match(toneCarrier('rhythm').rule, /syllabic nasal/);
  });
  test('a syllable that is nothing but a nasal is syllabic', () => {
    assert.equal(nfc(placeTone('m', 'high')), nfc('m̂'));
    assert.equal(nfc(placeTone('ng', 'rising')), nfc('ńg'));  // ng is one nasal, not n+g
  });
  test('nasals after an onset stay syllabic', () => {
    assert.equal(nfc(placeTone('hng', 'mid')), nfc('hn̄g'));
    assert.equal(nfc(placeTone('tng', 'rising')), nfc('tńg'));
  });
  test('an onset nasal before a vowel is untouched', () => {
    assert.equal(nfc(placeTone('mi', 'falling')), nfc('mì'));
  });
});
