/**
 * LO Engine — Lannang Orthography input & normalization
 *
 * Implements the rules of:
 *   Gonzales, Wilkinson Daniel Wong & Rauha Huigiok Lim. 2024.
 *   Lannang Orthography (LO) Third Edition. The Lannang Archives.
 *
 * Section references (§) throughout point at that document.
 * Pure ES module, zero dependencies — runs in the browser and in node --test.
 */

/* ── Tones (§I.D) ─────────────────────────────────────────────────────────
 * LO marks tone with four diacritics; the low [22] tone is unmarked, and
 * neutral tones are written with a leading '--' instead of a mark (§X).
 * Digits follow the row order of the §I.D table.                          */

export const TONES = [
  { id: 'high',    digit: '1', mark: '̂', ipa: '⁵⁵',    label: 'high',        demo: 'â' },
  { id: 'falling', digit: '2', mark: '̀', ipa: '⁵¹',    label: 'falling',     demo: 'à' },
  { id: 'rising',  digit: '3', mark: '́', ipa: '³⁵',    label: 'rising',      demo: 'á' },
  { id: 'mid',     digit: '5', mark: '̄', ipa: '³³',    label: 'mid',         demo: 'ā' },
  { id: 'low',     digit: '4', mark: '',       ipa: '²²',    label: 'low',         demo: 'a' },
  { id: 'neutral', digit: '0', mark: null,     ipa: '³¹/¹¹', label: 'neutral',     demo: '--a' },
];

const MARKS = TONES.map((t) => t.mark).filter(Boolean);
const MARK_SET = new Set(MARKS);
const BY_ID = new Map(TONES.map((t) => [t.id, t]));
const BY_DIGIT = new Map(TONES.map((t) => [t.digit, t]));

const VOWELS = new Set('aeiouAEIOU');
const NASAL_CHARS = new Set('mnMN');

export const NASAL_SUP = 'ⁿ'; // ⁿ — superscript n, nasalization (§VIII)
export const OPEN_O = "'";         // open 'o' marker (§III)

/* ── helpers ─────────────────────────────────────────────────────────────*/

/** Strip every LO tone diacritic, leaving the bare letters. */
export function stripTones(s) {
  return s.normalize('NFD').split('').filter((c) => !MARK_SET.has(c)).join('').normalize('NFC');
}

/** Which tone (if any) a syllable currently carries. */
export function readTone(s) {
  for (const c of s.normalize('NFD')) {
    if (MARK_SET.has(c)) return TONES.find((t) => t.mark === c).id;
  }
  return /(^|[\s-])--/.test(s) ? 'neutral' : 'low';
}

function applyMarkAt(letters, index, mark) {
  if (!mark || index < 0) return letters.join('');
  const out = letters.slice();
  out[index] = (out[index] + mark).normalize('NFC');
  return out.join('');
}

/* ── §IX Tone Mark Placement ─────────────────────────────────────────────*/

/**
 * Find the index of the letter that carries the tone mark, per §IX:
 *   (a,b) the rightmost vowel;
 *   (c)   else the rightmost syllabic 'm'/'n', else 'y';
 *   (e)   else — acronyms/initialisms — the final letter.
 * Returns { index, rule } so callers can explain the decision.
 */
export function toneCarrier(syllable) {
  const bare = stripTones(syllable);
  // ⁿ (§VIII) and the open-o apostrophe (§III) are not tone carriers.
  const core = bare.replace(new RegExp(`[${NASAL_SUP}${OPEN_O}]+$`), '');
  const letters = [...core];

  for (let i = letters.length - 1; i >= 0; i--) {
    if (VOWELS.has(letters[i])) return { index: i, rule: '§IX(b) rightmost vowel' };
  }
  // §IX(c) says "the rightmost 'm' or 'n' (IF SYLLABIC NASAL)". The
  // parenthetical is load-bearing: a nasal in onset position is not the
  // nucleus and must not take the mark. In 'rhythm' the final m IS the
  // nucleus ([ɹɪ.ðm̩] → rhythm̀); in 'myth' the initial m is an onset and the
  // nucleus is y ([mɪθ] → mŷth). Treating every nasal as syllabic produced
  // 'm̂yth'. A nasal counts as syllabic when it is not syllable-initial, or
  // when the syllable is nothing but nasals ('m', 'ng').
  // 'ng' is a digraph for one nasal [ŋ], so test the core as a unit, not letterwise.
  const allNasal = /^(m|n|ng)$/i.test(core);
  for (let i = letters.length - 1; i >= 0; i--) {
    if (NASAL_CHARS.has(letters[i]) && (i > 0 || allNasal))
      return { index: i, rule: '§IX(c) syllabic nasal' };
  }
  for (let i = letters.length - 1; i >= 0; i--) {
    if (letters[i] === 'y' || letters[i] === 'Y') return { index: i, rule: '§IX(c) y' };
  }
  return { index: letters.length - 1, rule: '§IX(e) acronym — final letter' };
}

/**
 * Apply a tone to one syllable, replacing any tone already present.
 * placeTone('niau', 'mid') === 'niaū'
 */
export function placeTone(syllable, toneId) {
  const tone = BY_ID.get(toneId);
  if (!tone) throw new Error(`unknown tone: ${toneId}`);

  const bare = stripTones(syllable);
  if (tone.id === 'neutral') return '--' + bare.replace(/^-+/, '');
  const plain = bare.replace(/^-+/, '');

  const { index } = toneCarrier(plain);
  return applyMarkAt([...plain], index, tone.mark).normalize('NFC');
}

/**
 * Numeric input: trailing digit selects the tone. 'niau4' → 'niaū'.
 * Text without a trailing digit is returned unchanged.
 */
export function applyNumeric(token) {
  const m = /^(.*?)([0-5])$/.exec(token);
  if (!m) return token;
  const tone = BY_DIGIT.get(m[2]);
  return tone ? placeTone(m[1], tone.id) : token;
}

/* ── Syllabic nasals (§VII) ──────────────────────────────────────────────*/

/** A syllable is a syllabic nasal if it has no vowel and ends in m / n / ng. */
export function isSyllabicNasal(syllable) {
  const bare = stripTones(syllable).replace(/^-+/, '');
  if ([...bare].some((c) => VOWELS.has(c))) return false;
  return /(ng|m|n)$/i.test(bare);
}

/* ── §III/§VII/§VIII — formal ⇄ convenience ──────────────────────────────
 * LO 3rd Ed. sanctions fallback spellings wherever the recommended form
 * cannot be typed. Each rule below cites the clause that licenses it.     */

export const FALLBACK_RULES = [
  { id: 'nasal',   cite: '§VIII',      recommended: 'siūⁿ',  fallback: 'siūnn', note: '“If one cannot type ⁿ, nn can be used”' },
  { id: 'sylnas',  cite: '§VII/§IX(d)',recommended: 'pǹg',   fallback: 'peùng', note: '“If one cannot type tone marks on the syllabic nasal, eu can be added”' },
  { id: 'openo',   cite: '§III',       recommended: "hō'",   fallback: 'hō',    note: 'the apostrophe may be omitted, merging open and closed o' },
  { id: 'acronym', cite: '§IX(f)',     recommended: 'TV̀',    fallback: 'TV',    note: '“the tone mark can be ignored” — tone is lost outright' },
];

/** Split text into tokens, keeping separators (spaces, hyphens) as tokens. */
function tokenize(text) {
  return text.split(/(\s+|--|-)/).filter((t) => t !== '');
}

/**
 * Recommended → convenience spelling. Purely mechanical: every rule is
 * licensed by a clause of the spec, so this direction is lossless to apply
 * (though it destroys information, which is the point being demonstrated).
 */
export function toConvenience(text) {
  const applied = [];
  const out = tokenize(text).map((tok) => {
    if (/^(\s+|--|-)$/.test(tok)) return tok;

    let s = tok;
    if (s.includes(NASAL_SUP)) {
      s = s.replaceAll(NASAL_SUP, 'nn');
      applied.push({ id: 'nasal', cite: '§VIII', from: tok, to: s });
    }
    if (isSyllabicNasal(s)) {
      const expanded = expandSyllabicNasal(s);
      if (expanded !== s) { applied.push({ id: 'sylnas', cite: '§VII', from: s, to: expanded }); s = expanded; }
    }
    if (s.includes(OPEN_O)) {
      const dropped = s.replaceAll(OPEN_O, '');
      applied.push({ id: 'openo', cite: '§III', from: s, to: dropped });
      s = dropped;
    }
    return s;
  }).join('');

  return { text: out.normalize('NFC'), applied };
}

/** pǹg → peùng : insert 'eu' before the nasal and move the tone onto the u. */
function expandSyllabicNasal(syllable) {
  const tone = readTone(syllable);
  const bare = stripTones(syllable);
  const m = /^(.*?)(ng|m|n)$/i.exec(bare);
  if (!m) return syllable;
  const [, onset, nasal] = m;
  const mark = BY_ID.get(tone)?.mark || '';
  return (onset + 'e' + ('u' + mark).normalize('NFC') + nasal).normalize('NFC');
}


/**
 * Is this token the §VII 'eu'-fallback spelling of a syllabic nasal?
 *
 * Two guards matter, and both are load-bearing — without them the round-trip
 * silently corrupts real words:
 *   • the onset must contain no vowel  — else 'tshieung' → 'tshing'
 *   • the onset must not be a nasal    — else 'neung' → 'nng'
 * The spec's own sample text (§XIV) keeps 'neung' and 'tshieung' unchanged in
 * BOTH styles, which is what makes them the right regression cases.
 */
export function isExpandedSyllabicNasal(token) {
  const m = /^(.*?)eu(ng|m|n)$/i.exec(stripTones(token));
  if (!m) return false;
  const onset = m[1];
  if ([...onset].some((c) => VOWELS.has(c))) return false;
  if (/(ng|n|m)$/i.test(onset)) return false;
  return true;
}

/** peùng → pǹg : pull 'eu' back out and move the tone onto the nasal. */
function contractSyllabicNasal(syllable) {
  const tone = readTone(syllable);
  const bare = stripTones(syllable);
  const m = /^(.*?)eu(ng|m|n)$/i.exec(bare);
  if (!m) return syllable;
  const [, onset, nasal] = m;
  const mark = BY_ID.get(tone)?.mark || '';
  const letters = [...(onset + nasal)];
  // the mark lands on the nasal's first letter (the 'n' of 'ng')
  return applyMarkAt(letters, onset.length, mark).normalize('NFC');
}

/* ── Open-o lexicon (§III) ───────────────────────────────────────────────
 * Going the other way is NOT symmetric. Dropping the open-o apostrophe is a
 * pure rule, but restoring it is not recoverable from spelling alone — the
 * spec's own minimal pair proves it: tò 'left' (closed) vs tò' 'degree'
 * (open) collapse to the same convenience spelling. So this direction needs
 * a lexicon, and must report what it cannot decide.                        */

export const OPEN_O_LEXICON = {
  "kô":  [{ formal: "kô'",  gloss: 'ago / past' }],
  "ó":   [{ formal: "ó'",   gloss: 'particle' }],
  "ho":  [{ formal: "ho'",  gloss: 'to give / causative' }],
  "lò":  [{ formal: "lò'",  gloss: 'road' }],
  "bô":  [{ formal: "bô'",  gloss: 'wife' }],
  "hō":  [{ formal: "hō'",  gloss: 'rain' }],
  "ngô": [{ formal: "ngô'", gloss: 'five (literary)' }],
  "pho": [{ formal: "pho'", gloss: "notebook (in pho'-wâ)" }],
  // genuinely ambiguous — the spec lists both readings (§III)
  "tò":  [{ formal: "tò",   gloss: 'left' }, { formal: "tò'", gloss: 'degree' }],
};

/**
 * Convenience → recommended spelling.
 * Returns { text, applied, ambiguous } — `ambiguous` lists the spots where
 * the open-o cannot be restored from spelling alone.
 */
export function toRecommended(text) {
  const applied = [];
  const ambiguous = [];

  const out = tokenize(text).map((tok) => {
    if (/^(\s+|--|-)$/.test(tok)) return tok;

    // strip trailing punctuation so lexicon lookup sees the bare word
    const trail = /[.,!?;:]+$/.exec(tok)?.[0] ?? '';
    let s = trail ? tok.slice(0, -trail.length) : tok;

    // §VIII — syllable-final 'nn' is the fallback for ⁿ. Medial 'nn'
    // (English-derived 'innèr') is a real geminate and must be left alone.
    if (/nn$/i.test(stripTones(s))) {
      const restored = s.replace(/nn$/i, NASAL_SUP);
      applied.push({ id: 'nasal', cite: '§VIII', from: s, to: restored });
      s = restored;
    }

    // §VII — 'eu' + nasal is the fallback for a marked syllabic nasal
    if (isExpandedSyllabicNasal(s)) {
      const contracted = contractSyllabicNasal(s);
      if (contracted !== s) { applied.push({ id: 'sylnas', cite: '§VII', from: s, to: contracted }); s = contracted; }
    }

    // §III — open o, lexicon-dependent
    const entries = OPEN_O_LEXICON[s.normalize('NFC')];
    if (entries) {
      if (entries.length === 1) {
        applied.push({ id: 'openo', cite: '§III', from: s, to: entries[0].formal, via: 'lexicon' });
        s = entries[0].formal;
      } else {
        ambiguous.push({ token: s, cite: '§III', candidates: entries });
      }
    }

    return s + trail;
  }).join('');

  return { text: out.normalize('NFC'), applied, ambiguous };
}

/**
 * Apply a tone to the LAST SYLLABLE of a word, leaving earlier syllables alone.
 *
 * placeTone() is deliberately syllable-scoped, but a keyboard hands it whole
 * words: you type 'Bi', tone it, then keep typing '-kok'. Passing the whole
 * token to placeTone strips the tone you already set ('Bí-kok' → 'Bi-kôk'),
 * silently destroying it. LO marks syllable boundaries with '-' and '--'
 * (§X, §XIII), so those are the split points -- as is whitespace: without it,
 * toning a later word strips the tone off an earlier one
 * ('siūⁿ jacke' + high -> 'siuⁿ jackê', losing the macron).
 */
export function toneLastSyllable(text, toneId) {
  const parts = text.split(/(\s+|-{1,2})/);
  let i = parts.length - 1;
  while (i >= 0 && (parts[i] === '' || /^(\s+|-{1,2})$/.test(parts[i]))) i--;
  if (i < 0) return text;

  if (toneId === 'neutral') {
    // §X: neutral tones take no diacritic — the leading dash IS the mark, and
    // it replaces whatever boundary was already typed.
    //
    // Appendix Resolution 6 (adopted 13-9): '--' is used ONCE before the first
    // neutral syllable of a word or phrase; every subsequent neutral syllable
    // in the same sequence takes a single '-'. So 'bè--pa-la', not
    // 'bè--pa--la'.
    parts[i] = stripTones(parts[i]).replace(/^-+/, '');
    let seenDouble = false;
    for (let j = i - 1; j >= 0; j--) {
      if (/^\s+$/.test(parts[j])) break;        // previous word: start over
      if (parts[j] === '--') { seenDouble = true; break; }
    }
    const sep = seenDouble ? '-' : '--';
    if (i > 0 && /^-{1,2}$/.test(parts[i - 1])) parts[i - 1] = sep;
    else parts.splice(i, 0, sep);
    return parts.join('').normalize('NFC');
  }

  parts[i] = placeTone(parts[i], toneId);
  return parts.join('').normalize('NFC');
}

/* ── ASCII input mode ────────────────────────────────────────────────────
 *
 * Vietnamese Telex assigns tones to letter keys (s f r x j) and works because
 * Vietnamese has a closed set of syllable finals, so those letters never occur
 * there. That does NOT hold for Lánnang-uè: LO writes English- and
 * Tagalog-derived words in their source spelling, so syllables end in s, f, r,
 * x, z, w, v and d all the time — 'malakâs', 'appeàr', 'chêf', 'pillòw',
 * 'quârtz'. Measured against the manual's own wordlist, 8 of 10 candidate tone
 * letters collide; only j and q are free, and two letters cannot encode six
 * tones.
 *
 * Digits, by contrast, appear in zero attested forms. So LO takes the VNI
 * (numeric) path rather than the Telex (letter) path.
 *
 * The rest of the Vietnamese model transfers intact — and LO supplies half of
 * it already: §VIII 'nn' and §VII 'eu' ARE its ASCII fallbacks, sanctioned by
 * the spec. Convenience spelling is LO's Telex; it only lacked tone entry.
 *
 *   siunn5  ->  siūⁿ        peung2  ->  pǹg
 *   niau5   ->  niaū        Bi3-kok1 -> Bí-kôk
 */

/**
 * One syllable of ASCII to LO.
 *
 * The tone digit may sit ANYWHERE in the syllable, not just at the end. Users
 * type it right after the vowel it hears ('siu5nn') as readily as at the end
 * ('siunn5'), and since no attested LO form contains a digit, any digit is
 * unambiguously a tone marker. Matching only a trailing digit made the display
 * regress mid-word: 'siu5' showed 'siū', then 'siu5n' fell back to 'siu5n'.
 */
export function syllableFromAscii(s) {
  const m = /^([^0-5]*)([0-5])([^0-5]*)$/.exec(s);
  const toned = m
    ? placeTone(m[1] + m[3], TONES.find((t) => t.digit === m[2]).id)
    : s;
  return toRecommended(toned).text;
}

/**
 * Full ASCII line to LO. Splits on whitespace and the LO syllable boundaries
 * (§X, §XIII) so each syllable carries its own tone digit, then rebuilds.
 */
export function fromAscii(text) {
  return text
    .split(/(\s+)/)
    .map((tok) => (/^\s+$/.test(tok) ? tok
      : tok.split(/(-{1,2})/).map((p) => (/^(-{1,2}|)$/.test(p) ? p : syllableFromAscii(p))).join('')))
    .join('')
    .normalize('NFC');
}

/* ── live composition ────────────────────────────────────────────────────
 * A keyboard cannot assume the user tones a syllable only once it is
 * finished. Vietnamese IMEs re-place the mark as the syllable grows, so
 * typing s-i-[tone]-u and s-i-u-[tone] converge on the same result. Without
 * that, tapping the tone early strands the mark on the wrong vowel
 * ('sīunn' instead of 'siūnn').
 */

/** True if this character ends the current syllable (§X, §XIII). */
export function isBoundary(ch) {
  return /^\s$/.test(ch) || /^-{1,2}$/.test(ch);
}

/**
 * Append `ch` to `buffer`, re-placing the active syllable's tone so the mark
 * stays on the letter §IX actually selects. Pass the tone currently armed for
 * this syllable, or null. Tone entry becomes order-independent within a
 * syllable, which is the property that makes the keyboard feel unsurprising.
 */
export function insertWithTone(buffer, ch, toneId) {
  const next = buffer + ch;
  if (!toneId || isBoundary(ch)) return next.normalize('NFC');
  return toneLastSyllable(next, toneId);
}

/* ── prediction ──────────────────────────────────────────────────────────
 * Tone costs an extra keystroke on every syllable, since LO assigns tone to
 * every word regardless of source language. Prediction pays that back: type
 * the bare letters, take the toned form in one tap.
 *
 * It is also the interface for the one thing the engine refuses to decide on
 * its own. §III open-o is not recoverable by rule -- 'tò' is either 'left'
 * (closed) or 'degree' (open) -- so toRecommended() reports it as ambiguous.
 * A candidate list resolves that by asking rather than guessing.
 */

/**
 * Rank lexicon entries against a partial word.
 * Matches the recommended spelling and any sanctioned fallback variant, both
 * with tones and ignoring them, so a half-typed bare form still finds its
 * toned headword.
 */
export function predict(prefix, entries, limit = 4) {
  const q = prefix.trim().toLowerCase().normalize('NFC');
  if (!q) return [];
  const bare = stripTones(q);

  const scored = [];
  for (const e of entries) {
    const forms = [e.lo, ...(e.variants ?? [])].map((f) => f.toLowerCase().normalize('NFC'));
    let score = Infinity;
    for (const f of forms) {
      const fb = stripTones(f);
      if (f === q)               score = Math.min(score, 0);   // exact, with tones
      else if (fb === bare)      score = Math.min(score, 1);   // exact, tones aside
      else if (f.startsWith(q))  score = Math.min(score, 2);   // prefix, with tones
      else if (fb.startsWith(bare)) score = Math.min(score, 3); // prefix, tones aside
    }
    if (score < Infinity) scored.push({ entry: e, score });
  }

  return scored
    .sort((a, b) =>
      a.score - b.score ||
      a.entry.lo.length - b.entry.lo.length ||
      a.entry.lo.localeCompare(b.entry.lo))
    .slice(0, limit)
    .map(({ entry }) => entry);
}
