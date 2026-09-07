/**
 * Test fixtures transcribed verbatim from:
 *   Gonzales & Lim. 2024. Lannang Orthography (LO) Third Edition.
 *   The Lannang Archives. www.lannangarchives.org
 *
 * Every case below is a worked example printed in the manual, so the manual
 * itself is the oracle — nothing here is invented.
 */

/* §IX Tone Mark Placement — [input, tone, expected, citation] */
export const PLACEMENT = [
  ['he',     'high',    'hê',      '§IX(a) vowel'],
  ['sayang', 'high',    'sayâng',  '§IX(a) Tagalog-derived'],
  ['string', 'falling', 'strìng',  '§IX(a) English-derived'],
  ['kau',    'high',    'kaû',     '§IX(b) rightmost vowel'],
  ['suaⁿ',  'mid',     'suāⁿ',   '§IX(b) rightmost vowel + ⁿ'],
  ['food',   'high',    'foôd',    '§IX(b) consecutive vowels'],
  ['time',   'falling', 'timè',    '§IX(b) non-consecutive vowels'],
  ['m',      'high',    'm̂',      '§IX(c) syllabic nasal'],
  ['hng',    'mid',     'hn̄g',    '§IX(c) syllabic nasal in cluster'],
  ['rhythm', 'falling', 'rhythm̀',  '§IX(c) nasal outranks y'],
  // §IX applies per SYLLABLE. 'fancỳ' [fæn²².si⁵¹] is fan + cy; the mark
  // lands on the y because the second syllable has no vowel. The engine is
  // syllable-scoped by design (a keyboard types one syllable, then a tone
  // key), so word-level syllabification is a separate, later concern.
  ['cy',     'falling', 'cỳ',      '§IX(c) y when no vowel'],
  ['KKB',    'falling', 'KKB̀',     '§IX(e) initialism'],
  ['CR',     'falling', 'CR̀',      '§IX(e) initialism'],
  ['TV',     'falling', 'TV̀',      '§IX(e) initialism'],
  // §II aspiration contrasts — placement must not disturb the 'h'
  ['phe',    'mid',     'phē',     '§II aspirated'],
  ['tshe',   'falling', 'tshè',    '§II aspirated'],
  ['tse',    'mid',     'tsē',     '§II unaspirated'],
  // §V glottal stops
  ['puih',   'rising',  'puíh',    '§V(b) final glottal stop'],
  ['thueh',  'rising',  'thuéh',   '§V(b) final glottal stop'],
  // §I.A consonant table
  ['mi',     'falling', 'mì',      '§I.A [m] noodles'],
  ['bo',     'rising',  'bó',      '§I.A [b] not'],
  ['gu',     'rising',  'gú',      '§I.A [g] cow'],
  ['cha',    'rising',  'chá',     '§I.A [tʃ] here'],
  ['sho',    'mid',     'shō',     '§I.A [ʃ] hot'],
  ['ya',     'rising',  'yá',      '§I.A [j] very'],
  ['wa',     'falling', 'wà',      '§I.A [w] wow'],
];

/* §VII / §VIII / §III — recommended ⇄ convenience pairs */
export const FALLBACK_PAIRS = [
  ['huáⁿ',  'huánn',  '§VIII nasalization'],
  ['ìⁿ',    'ìnn',    '§VIII nasalization'],
  ['siūⁿ',  'siūnn',  '§VIII nasalization'],
  ['m-kû',   'eum-kû',  '§VII syllabic nasal'],
  ['pǹg',    'peùng',   '§VII syllabic nasal'],
  ['á-m̂',   'á-eûm',   '§IX(d) syllabic nasal'],
  ['hn̄g',   'heūng',   '§IX(d) syllabic nasal'],
  ["bô'",    'bô',      '§III open o'],
  ["hō'",    'hō',      '§III open o'],
  ["tò'",    'tò',      '§III open o'],
];

/* §XIV — the same passage printed in both styles. The spec's own parallel text. */
export const SAMPLE_FORMAL =
  "U tsi maî kô' ó', North Wînd kiaū Sùn lê uān-kē para e khuâⁿ siang-ngá khâ malakâs. " +
  "Tsam-mâ--pa to bo láng, m-kú īn neung é tsâ khuâⁿ tioh tsi ge láng ti ng-siâk e kió, " +
  "lê tshieung jackêt habang lê kiaⁿ-lò'. Īn siuⁿ bê ho' hî-ge jackêt pē--khi-lai.";

export const SAMPLE_CONVENIENCE =
  "U tsi maî kô ó, North Wînd kiaū Sùn lê uān-kē para e khuânn siang-ngá khâ malakâs. " +
  "Tsam-mâ--pa to bo láng, eum-kú īn neung é tsâ khuânn tioh tsi ge láng ti eung-siâk e kió, " +
  "lê tshieung jackêt habang lê kiann-lò. Īn siunn bê ho hî-ge jackêt pē--khi-lai.";
