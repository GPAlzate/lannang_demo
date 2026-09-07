# DESIGN.md

## Color

Strategy: **Restrained.** Tinted warm neutrals, one accent used only for the active tone
key, the current target word, focus, and the primary action.

```
--bg          oklch(96.8% .009 67)   warm paper ground
--paper       oklch(99.2% .005 67)   raised surfaces, keys
--ink         oklch(24% .018 55)     text, primary button
--dim         oklch(49% .019 55)     secondary text, labels
--line        oklch(88% .014 62)     borders, dividers
--accent      oklch(52% .155 35)     rust; active tone, target word, focus
--accent-soft oklch(94% .035 35)     accent wash
--good        oklch(45% .11 153)     correct answer
--good-soft   oklch(94% .04 153)
```

No pure black or white. Every neutral is tinted toward hue 55–67 (warm). Chroma stays
low near the lightness extremes.

## Typography

One family: `-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`.
Monospace (`ui-monospace, SFMono-Regular, Menlo`) only for the interface contract block.

Scale, fixed rem/px, ratio ~1.2:

```
prompt      22px / 750  / -.03em    "Write the word for dog"
answer      25px / 400              the learner's typed text
passage   14.5px / 400  / 1.55      LO reading text
body        13px / 400  / 1.5       feedback
label     10.5px / 720  / .07em     step markers, uppercase
meta        11px / 400              statuses, attribution
```

Learner-facing copy never uses IPA, section numbers, or codepoints.

## Elevation

Flat. Borders and background shifts carry separation, not shadow. Two exceptions: keys
get `0 1px 0 oklch(0% 0 0/.16)` for physicality, and the docked keyboard on mobile gets a
soft upward shadow to sit above scrolling content.

## Components

- **Keys**: 7px radius, paper surface, 1px hard bottom shadow, press translates 1px down.
- **Tone keys**: glyph + name; active state fills with accent.
- **Suggestions**: solid border for attested dictionary words, dashed for generated tone
  forms. The distinction is load-bearing and must survive any restyle.
- **Answer field**: 1.5px border. Accent when focused, green when correct, red when wrong.
- **Disclosure**: reviewer-facing capability and scope live behind one toggle, closed by
  default.

## Motion

150–220ms, ease-out. Only: border and background on state change, disclosure height,
key press. No page-load choreography. `prefers-reduced-motion` disables all of it.

## Bans specific to this project

- No progress bars, streaks, scores, or celebratory animation.
- No linguistic citations on the learner surface. They belong in the disclosure.
- No simulated controls. Anything not implemented is named in the disclosure, not
  rendered as a dead button.
