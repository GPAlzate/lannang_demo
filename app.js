import { TONES, placeTone, toneLastSyllable, insertWithTone, isBoundary, fromAscii, stripTones } from './lo-engine.js';
import { align } from './lo-diff.js';
import { SAMPLE_FORMAL, SAMPLE_CONVENIENCE } from './lo-fixtures.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const nfc = (s) => s.normalize('NFC');

/* ── state: ONE record that moves through the flow ───────────────── */
const rec = { typed: '', match: null, hypothesis: '', corrected: '', comparison: null };
let stage = 1, tone = 'low', target = 'typed';
let shift = 0;   // 0 = off, 1 = next letter only, 2 = locked (needed for §IX(e) acronyms)
let mode = 'keys';   // 'keys' = tone row; 'ascii' = VNI-style digits, no layer switch
let armed = null;    // tone active for the syllable being typed; cleared at a boundary
let ascii = '';      // raw ASCII buffer in ascii mode

let CORPUS = [], LANG = new Map();
fetch('corpus.json').then((r) => r.json()).then((d) => {
  CORPUS = d.entries;
  for (const e of CORPUS) LANG.set(nfc(e.lo.toLowerCase()), e.source);
  search();
});

/* ── stage plumbing ──────────────────────────────────────────────── */
function advance(to) {
  stage = Math.max(stage, to);
  for (let i = 1; i <= 5; i++) {
    const card = $('#c' + i);
    if (card && i > 1) card.hidden = i > stage;
    const st = document.querySelector(`.step[data-step="${i}"]`);
    st.classList.toggle('on', i === stage);
    st.classList.toggle('done', i < stage);
  }
}

/* ── 1. typing ───────────────────────────────────────────────────── */
function paint() {
  if (mode === 'ascii') {
    // Vietnamese IMEs transform in place and never show the raw keystrokes -- a
    // message field reading 'siu5nn' looks broken. But the user still needs to
    // know which part is still being edited, so the syllable in composition is
    // underlined, the way CJK IMEs mark an uncommitted string.
    const [head, tail] = /^(.*?)([^\s-]*)$/.exec(ascii).slice(1);
    const done = fromAscii(head), live = fromAscii(tail);
    rec.typed = done + live;
    $('#entryText').innerHTML =
      esc(done) + (live ? `<u class="composing">${esc(live)}</u>` : '');
    $('#raw').innerHTML = ascii ? `keystrokes <b>${esc(ascii)}</b>` : '';
    $('#raw').hidden = !ascii;
    $('#fixText').textContent = rec.corrected;
    $('#entry').classList.toggle('live', target === 'typed');
    $('#fixEntry').classList.toggle('live', target === 'corrected');
    return;
  }
  $('#entryText').textContent = rec.typed;
  $('#fixText').textContent = rec.corrected;
  $('#entry').classList.toggle('live', target === 'typed');
  $('#fixEntry').classList.toggle('live', target === 'corrected');
}

const buf = () => (target === 'typed' ? rec.typed : rec.corrected);
const setBuf = (v) => { target === 'typed' ? (rec.typed = v) : (rec.corrected = v); };

function paintShift() {
  const b = document.getElementById('shift');
  b.classList.toggle('on', shift === 1);
  b.classList.toggle('lock', shift === 2);
  document.querySelectorAll('.k[data-ins]').forEach((k) => {
    const c = k.dataset.ins;
    if (/^[a-z]$/.test(c) || /^[A-Z]$/.test(c)) k.textContent = shift ? c.toUpperCase() : c.toLowerCase();
  });
}

function insert(ch) {
  if (mode === 'ascii') {
    if (shift && /^[a-z]$/i.test(ch)) { ch = ch.toUpperCase(); if (shift === 1) { shift = 0; paintShift(); } }
    ascii += ch;
    paint(); advance(2); search();
    return;
  }
  if (shift && /^[a-z]$/i.test(ch)) {
    ch = ch.toUpperCase();
    if (shift === 1) { shift = 0; paintShift(); }
  }
  setBuf(insertWithTone(buf(), ch, armed));
  if (isBoundary(ch)) { armed = null; syncToneKeys(); }
  paint();
  if (target === 'typed') { advance(2); search(); }
}

function syncToneKeys() {
  document.querySelectorAll('.tone-k').forEach((b) => b.classList.toggle('on', b.dataset.tone === armed));
}

function applyTone(id) {
  tone = id;
  armed = id;
  setBuf(nfc(toneLastSyllable(buf(), id)));
  syncToneKeys();
  paint();
  if (target === 'typed') search();
}

function backspace() {
  if (mode === 'ascii') { ascii = ascii.slice(0, -1); paint(); search(); return; }
  armed = null; syncToneKeys();
  const b = [...buf()];
  // remove a whole grapheme, combining mark and all
  b.pop();
  setBuf(nfc(b.join('')));
  paint();
  if (target === 'typed') search();
}

/* ── 2. corpus search ────────────────────────────────────────────── */
function search() {
  const q = nfc(rec.typed.trim().toLowerCase());
  const list = $('#matches');
  if (!q) { list.innerHTML = ''; $('#noMatch').hidden = true; return; }

  const bare = stripTones(q);
  const hits = CORPUS.filter((e) => {
    const forms = [e.lo, ...(e.variants ?? [])].map((f) => nfc(f.toLowerCase()));
    return forms.some((f) => f.startsWith(q) || stripTones(f).startsWith(bare))
        || e.gloss.toLowerCase().includes(q);
  }).slice(0, 6);

  $('#noMatch').hidden = hits.length > 0;
  list.innerHTML = hits.map((e, i) => `<li tabindex="0" data-i="${i}">
      <span class="m-lo">${e.lo}</span>
      <span class="m-gl">${e.gloss}${e.variants?.length ? ` <i>also ${e.variants.join(', ')}</i>` : ''}</span>
      <span class="badge ${e.source}">${e.source}</span></li>`).join('');
  [...list.children].forEach((li, i) => {
    li.onclick = () => select(hits[i]);
    li.onkeydown = (ev) => { if (ev.key === 'Enter') select(hits[i]); };
  });
}

/* ── 3. listen ───────────────────────────────────────────────────── */
function select(e) {
  rec.match = e;
  $('#selLo').textContent = e.lo;
  $('#selGloss').textContent = e.gloss;
  $('#selSrc').textContent = e.source;
  $('#selSrc').className = 'badge ' + e.source;
  $('#selIpa').textContent = e.ipa ? `[${e.ipa}]` : '';
  const has = Boolean(e.audio);
  $('#play').disabled = !has;
  $('#playLabel').textContent = has ? 'Play recording' : 'No recording yet';
  $('#audioNote').textContent = has
    ? 'Recorded by a community speaker.'
    : 'This word has no linked recording yet. Recordings come from the archive, or from speakers who contribute one.';
  advance(4);
}
$('#play').onclick = () => { if (rec.match?.audio) new Audio(rec.match.audio).play(); };

/* ── 4. compare ──────────────────────────────────────────────────── */
const WHY = { ok: 'match', variant: 'same word', tone: 'tone missed',
              codeswitch: 'wrong language', sub: 'different', ins: 'added', del: 'dropped' };

function compare() {
  const reference = rec.match ? rec.match.lo : rec.typed;
  const hypothesis = $('#hyp').value.trim();
  if (!hypothesis) return;
  rec.hypothesis = hypothesis;

  const cmp = align(reference, hypothesis, LANG);
  rec.comparison = cmp;
  const s = cmp.stats;

  $('#scores').innerHTML = `
    <div class="sc ok"><div class="n">${s.correct + s.variant}/${s.tokens}</div><div class="l">heard correctly</div></div>
    <div class="sc tone"><div class="n">${s.tone}</div><div class="l">tones missed</div></div>
    <div class="sc cs"><div class="n">${s.codeswitch}</div><div class="l">wrong language</div></div>`;

  $('#pairs').innerHTML = cmp.rows.map((r) => `<div class="pair ${r.type}">
      <span class="r">${r.ref ?? '<span class="a">—</span>'}</span>
      <span class="h">${r.hyp ?? '<span class="a">—</span>'}</span>
      <span class="why">${WHY[r.type]}</span></div>`).join('');

  $('#cmpOut').hidden = false;
  rec.corrected = reference;
  paint();
  advance(5);
}
$('#compare').onclick = compare;
$('#demoVariant').onclick = () => {
  rec.match = { lo: SAMPLE_FORMAL, gloss: 'sample passage (§XIV)', source: 'Hokkien', ipa: null, audio: null };
  $('#hyp').value = SAMPLE_CONVENIENCE;
  compare();
};

/* ── 5. save ─────────────────────────────────────────────────────── */
$('#save').onclick = () => {
  const out = {
    lo: rec.corrected || rec.typed,
    gloss: rec.match?.gloss ?? null,
    source: rec.match?.source ?? null,
    audio: rec.match?.audio ?? null,
    machineTranscript: rec.hypothesis || null,
    errors: rec.comparison
      ? { tone: rec.comparison.stats.tone, codeswitch: rec.comparison.stats.codeswitch,
          wer: +rec.comparison.stats.wer.toFixed(3) }
      : null,
    correctedAt: new Date().toISOString(),
  };
  $('#saved').textContent = JSON.stringify(out, null, 2);
  $('#saved').hidden = false;
};
$('#reset').onclick = () => {
  Object.assign(rec, { typed: '', match: null, hypothesis: '', corrected: '', comparison: null });
  $('#hyp').value = ''; $('#saved').hidden = true; $('#cmpOut').hidden = true;
  stage = 1; target = 'typed'; advance(1); search(); paint();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

/* ── keyboard ────────────────────────────────────────────────────── */
const digitRow = document.createElement('div');
digitRow.className = 'kbrow digits';
digitRow.innerHTML = TONES.map((t) => `<button class="k" data-ins="${t.digit}">${t.digit}</button>`).join('');
$('#kb').prepend(digitRow);

$('#toneRow').innerHTML = TONES.map((t) => `<button class="tone-k" data-tone="${t.id}">
    <span class="g">${t.demo}</span><span class="d">${t.digit}</span></button>`).join('');
document.querySelectorAll('.tone-k').forEach((b) => { b.onclick = () => applyTone(b.dataset.tone); });

document.querySelectorAll('.kbrow[data-keys]').forEach((row) => {
  row.innerHTML = [...row.dataset.keys].map((c) => `<button class="k" data-ins="${c}">${c}</button>`).join('');
});
document.addEventListener('click', (e) => {
  const k = e.target.closest('[data-ins]');
  if (k) insert(k.dataset.ins);
});
$('#back').onclick = backspace;
document.querySelectorAll('#mode button').forEach((b) => {
  b.onclick = () => {
    mode = b.dataset.mode;
    document.querySelectorAll('#mode button').forEach((x) => x.classList.toggle('on', x === b));
    $('#kb').classList.toggle('ascii', mode === 'ascii');
    $('#hint').textContent = mode === 'ascii'
      ? 'Type letters and a tone number, like siunn5. No tone keys, no switching layers.'
      : 'Tap letters, then a tone. Hokkien, Tagalog and English all welcome.';
    ascii = ''; rec.typed = ''; $('#raw').hidden = true;
    paint(); search();
  };
});

$('#shift').onclick = () => { shift = shift === 0 ? 1 : shift === 1 ? 2 : 0; paintShift(); };

$('#entry').onclick = () => { target = 'typed'; paint(); };
$('#fixEntry').onclick = () => { target = 'corrected'; paint(); };

document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'TEXTAREA') return;
  if (e.key === 'Backspace') { e.preventDefault(); backspace(); }
  else if (/^[a-z'\-,. ]$/i.test(e.key)) { e.preventDefault(); insert(e.key); }
  else if (/^[0-5]$/.test(e.key)) {
    e.preventDefault();
    // In plain-letters mode a digit is a CHARACTER: it goes into the ASCII
    // buffer and fromAscii() consumes it. Only in tone-key mode does it act
    // as a tone key. Routing it to applyTone() in both modes meant digits
    // silently did nothing on a physical keyboard in plain-letters mode.
    if (mode === 'ascii') { insert(e.key); return; }
    const t = TONES.find((x) => x.digit === e.key);
    if (t) applyTone(t.id);
  }
  // 6-9 are not tone digits, so they are ordinary characters in both modes.
  // (0-5 still cannot be typed literally in plain-letters mode -- Telex solves
  // that with an escape sequence; noted in the README as an open gap.)
  else if (/^[6-9]$/.test(e.key)) { e.preventDefault(); insert(e.key); }
});

advance(1); paint(); paintShift();

/* ── #demo — drives the real flow end to end, for recording ──────── */
if (location.hash === '#demo') {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const typeOut = async (s) => { for (const ch of s) { insert(ch); await wait(110); } };
  (async () => {
    await wait(600);
    await typeOut('siu');
    applyTone('mid');  await wait(450);
    insert('ⁿ');       await wait(950);
    const hit = CORPUS.find((e) => nfc(e.lo) === nfc(rec.typed));
    if (hit) { select(hit); await wait(900); }
    $('#demoVariant').click();
    await wait(500);
    $('#c4').scrollIntoView({ behavior: 'smooth', block: 'start' });
  })();
}
