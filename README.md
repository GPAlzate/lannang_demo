# Lánnang-uè Workbench

A tool for writing Lánnang-uè in the Lannang Orthography, finding it in the archive,
and correcting what speech recognition gets wrong.

Built on Gonzales, Wilkinson Daniel Wong & Rauha Huigiok Lim. 2024.
*Lannang Orthography (LO) Third Edition.* The Lannang Archives.

## The app

`index.html` is the whole learner surface: two tabs over one engine.

**Read** — tap any word in an LO passage and it decomposes into syllables, each with its
tone, its meaning in the passage, and which letter carries the mark. Nothing is prepared
per word; the breakdown is computed by the same §IX cascade that places the marks when
you type, which is why it works on words nobody entered in advance.

**Write** — you are given a meaning, you type the word on the LO keyboard, and it says
what is right or wrong syllable by syllable, with the rule that decided it.

## Why the keyboard matters

LO 3rd Edition documents four fallback spellings that exist only because input technology
doesn't. In the spec's own words:

| § | The spec says | Recommended | Fallback |
|---|---|---|---|
| §VIII | "If one cannot type `ⁿ`" | `siūⁿ` | `siūnn` |
| §VII | "If one cannot type tone marks on the syllabic nasal" | `pǹg` | `peùng` |
| §IX(d) | same, for tone placement | `hn̄g` | `heūng` |
| §IX(f) | "the tone mark can be ignored" | `TV̀` | `TV` — tone lost |

The keyboard retires all four. Typing a fallback spelling still finds the recommended
headword, so nobody is punished for typing what they already type.

## Keyboard completeness

`keyboard.test.js` asserts that **every LO form printed in the manual is typeable** —
348 forms (294 headwords, their sanctioned variants, and the §XIV running passage),
52 distinct characters, 0 unreachable.

That test exists because the first version failed it. Three gaps, all found by auditing
rather than by eye:

- **the single hyphen** — 75 occurrences across 36 forms (`á-tsî`, `Bí-kôk`, `m-kú`).
  The keyboard had `--` for neutral tones but no plain `-`.
- **capitals** — no shift key, which blocked §XV proper nouns *and* §IX(e) initialisms.
  The engine placed the tone in `TV̀` correctly and had a passing test for it, but the
  keyboard could not type `TV`. Engine-complete is not keyboard-complete.
- **comma and full stop** — needed for running text.

A second bug the coverage test could not catch: `placeTone()` is syllable-scoped, but a
keyboard hands it whole words. Typing `Bi`, toning it, then typing `-kok` and toning again
produced `Bi-kôk` — the first tone silently destroyed. `toneLastSyllable()` splits on the
LO syllable boundaries (`-`, `--`) and tones only the final syllable.

## ASCII input: the VNI path, not the Telex path

Vietnamese Telex puts tones on letter keys (`as`->á, `af`->à) and works because
Vietnamese has a closed set of syllable finals, so those letters never appear there.
That does not hold for LO, which writes English- and Tagalog-derived words in their
source spelling. Measured against the manual's own wordlist:

| candidate | syllable-final | collides with |
|---|---|---|
| `r` | 25 | appeàr, authòr, chaìr |
| `d` | 14 | boârd, buîld, chôrd |
| `s` | 6 | chismîs, tapôs, malakâs |
| `f` `w` | 4 each | chêf, wôlf / allòw, pillòw |
| `x` `z` `v` | 1-2 | lunchbôx, quârtz, TV |

8 of 10 candidates collide; only `j` and `q` are free, and two letters cannot encode
six tones. **Digits appear in zero attested forms**, so LO takes the numeric route.

What does transfer is the deeper model: type plain ASCII, transform live, never switch
layers. And LO already supplies half of it — §VIII `nn` and §VII `eu` are its sanctioned
ASCII fallbacks. Convenience spelling *is* LO's Telex; it only lacked tone entry.

```
siunn5   -> siūⁿ        peung2   -> pǹg
niau5    -> niaū        Bi3-kok1 -> Bí-kôk
malakas1 -> malakâs     TV2      -> TV̀
```

`fromAscii()` is a pure string-to-string transducer, which is the portable asset here:
it is what ports to a Keyman `.kmn`, an Android IME, or an iOS keyboard extension. The
tone row is an app affordance; the transducer is the keyboard.

## Prediction — and why it matters more here than in English

`index.html` shows a candidate strip above the tone row. It is not a dictionary
lookup; it inserts into what you are typing.

Two reasons it earns the space:

- **It pays back the tone keystroke.** LO assigns tone to every word regardless of
  source language, so every syllable costs an extra tap. Type `siu`, take `siūⁿ` with
  the tone already correct, one tap.
- **It resolves what the engine refuses to guess.** §III open-o is not recoverable by
  rule -- `tò` is either 'left' (closed) or `tò'` 'degree' (open) -- so
  `toRecommended()` reports it ambiguous rather than picking. The candidate bar is
  where that gets decided, by the person typing. Same for `bó` 'not' vs `bô'` 'wife'.

Candidates carry a source-language dot, so code-switching stays visible without
interrupting.

### Known gap

In plain-letters mode the digits 0-5 are consumed as tone markers, so they cannot be
typed literally. Telex handles this with an escape sequence (double the key); LO needs
the equivalent. No attested LO form contains a digit, so this affects only free text
such as `CR 2`. Digits 6-9 insert normally.

## Comparison that means something

Generic WER calls `khuâⁿ` vs `khuânn` a substitution, which hides the errors that matter.
`lo-diff.js` separates them:

- **same word** — a sanctioned §VIII/§VII spelling variant. Not an error.
- **tone missed** — right syllable, wrong or absent tone mark.
- **wrong language** — the model resolved a Tagalog or English word into the wrong language.

That distinction is the point: a model can score 0% on exact match while having heard every
syllable correctly and missed only tone. That tells you what to fix.

## Data

`corpus.json` — 294 headwords seeded from the manual's worked examples, with IPA, English
gloss, and source language (97 Hokkien, 140 English, 59 Tagalog — the code-switching is
visible in the data itself).

Two things were deliberately handled during extraction:

- Counter-examples printed under *"The following are not recommended"* are **excluded**.
  A user-facing dictionary must not show deprecated spellings as valid entries.
- Sanctioned fallback spellings are **folded into their recommended headword** as variants,
  using `toRecommended()` itself to decide the headword.

`audio` is `null` on every entry. Recordings come from LanCorp (licence review pending) or
from community speakers. Stage 3 is built and waiting on that data, not on code.

## Run

```bash
npm test        # 55 conformance tests against the manual's worked examples
npm run dev     # http://localhost:8080
```

Zero dependencies, no build step, deployable as static files.

## Engine

`lo-engine.js` implements §IX tone-mark placement as an explicit cascade — rightmost vowel,
else rightmost syllabic nasal, else `y`, else (initialisms) the final letter — plus
bidirectional normalization between recommended and convenience spellings.

Restoring the open-o apostrophe is **not** rule-recoverable: the spec's own minimal pair,
`tò` 'left' vs `tò'` 'degree' (§III), collapses to one convenience spelling. `toRecommended()`
returns an `ambiguous` list and reports what it cannot decide rather than guessing.

Fixtures come from the manual, so the manual is the oracle. The headline test is §XIV, where
the authors print the same passage in both styles: the engine must reproduce each from the
other, exactly.

`placeTone()` is syllable-scoped by design — a keyboard types one syllable, then a tone key.
Word-level syllabification (`fancỳ` = `fan` + `cy`) is a separate concern.

## Roadmap

Fine-tuned open-vocabulary STT · neural TTS · tone-sandhi-aware synthesis · HokkienHub
integration (needs a documented API and permission) · native keyboard distribution, most
likely via [Keyman](https://keyman.com/), which already ships a POJ keyboard for Hokkien to
iOS and Android · community contribution infrastructure.
