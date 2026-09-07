# PRODUCT.md

register: product

## Product purpose

A Lánnang-uè reading and writing tool built around a Lannang Orthography (LO) keyboard.

**Read**: tap any word in a passage and the engine explains how its spelling works,
syllable by syllable. This runs on arbitrary LO text, not prepared per-word data.

**Write**: type a word with the correct tone. The keyboard applies LO's tone-placement
rules, so the learner supplies only what they know: the syllable and its tone.

Reading is the more important half. The manual states that Lánnang-uè "has historically
lacked a standardized writing system": the community can already speak it. Literacy in a
new orthography is the actual problem.

Built as a prototype for a Lannang Learning developer role. The LO engine is real and
tested; speech and dictionary features are explicitly outstanding.

## Users

**Primary: learners.** Lannang teenagers and adults in Metro Manila who speak Lánnang-uè
but have never written it. They are fluent in English and Tagalog keyboards. They do not
know what a syllabic nasal is and should never need to.

**Secondary: teachers** preparing lesson material, who need the written form to be correct.

**Tertiary: the hiring reviewer** (Dr. Wilkinson Daniel Wong Gonzales, who co-authored the
orthography and published the LanCorp corpus). Needs evidence of capability and honest
scope. Must not be served at the learner's expense.

## Scene

A Lannang teenager on their phone in the evening, practising how to write a word they
already know how to say. Warm, unhurried, personal. Not a dim-room professional tool.

## Tone

Plain and encouraging. Explain in the learner's language, not the linguist's. "The tone
mark goes on the last vowel" beats "§IX(b) rightmost vowel" on the learner surface, even
though the second is what the engine actually computed.

## Anti-references

- Corpus annotation tools and segment queues. This is not research software.
- Duolingo gamification: streaks, gems, mascots, celebratory confetti.
- Dense linguistic apparatus on the learner surface: IPA, section citations, Unicode
  codepoints. All real, all belong elsewhere.
- Dashboards. There is no data to display; there is a word to write.

## Strategic principles

1. **The learner's task is the page.** Everything else is subordinate or hidden.
2. **Reading precedes writing.** Tapping a word to see how it is built teaches the
   orthography; the writing exercise then tests it. Any word in the passage can become
   the exercise.
3. **Nothing is simulated.** A control either works or is listed as outstanding. The
   engine reports ambiguity rather than guessing; the interface must match that honesty.
4. **The keyboard carries the orthography.** Learners choose syllable and tone. Mark
   placement, nasalization, and neutral-tone hyphenation are the system's job.
5. **Evidence is available, not imposed.** Capability and scope stay one disclosure away.
