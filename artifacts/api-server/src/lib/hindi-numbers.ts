// Rewrites Hindi fractional number phrases (सवा, साढ़े, पौने, डेढ़, ढाई) as digits
// before translation ("पौने नौ बजे" → "8:45 बजे", "सवा लाख" → "1 लाख 25 हज़ार").
// Sarvam keeps digits intact but mistranslates these words:
// in eval/, "पौने नौ बजे" (8:45) came back as 9:45 in all four target languages and
// "सवा लाख" (₹1.25 lakh) as ₹1.25 crore in Bengali, while plain digits had zero errors.

// ponytail: 1–20 and the tens only — a number word outside this table is left as-is
// (the old behaviour), add the remaining 21–99 words if speech data shows them.
const NUMS = nfcKeys({
  एक: 1, दो: 2, तीन: 3, चार: 4, पाँच: 5, पांच: 5, छह: 6, छः: 6, छे: 6, सात: 7, आठ: 8,
  नौ: 9, दस: 10, ग्यारह: 11, बारह: 12, तेरह: 13, चौदह: 14, पंद्रह: 15, पन्द्रह: 15,
  सोलह: 16, सत्रह: 17, अठारह: 18, उन्नीस: 19, बीस: 20, तीस: 30, चालीस: 40, पचास: 50,
  साठ: 60, सत्तर: 70, अस्सी: 80, नब्बे: 90,
});
const SCALES = nfcKeys({ सौ: 100, हज़ार: 1e3, हजार: 1e3, लाख: 1e5, करोड़: 1e7, करोड: 1e7 });
const OFFSETS = nfcKeys({ सवा: 0.25, साढ़े: 0.5, पौने: -0.25 });
const FIXED = nfcKeys({ डेढ़: 1.5, ढाई: 2.5 });

// Nukta letters (ज़, ढ़) have two Unicode spellings; NFC makes input and table agree.
function nfcKeys(o: Record<string, number>): Record<string, number> {
  return Object.fromEntries(Object.entries(o).map(([k, v]) => [k.normalize("NFC"), v]));
}
const alt = (o: Record<string, number>) =>
  Object.keys(o).sort((a, b) => b.length - a.length).join("|");

const END = "(?![\\p{L}\\p{M}])";
const PHRASE = new RegExp(
  `(?<![\\p{L}\\p{M}])(${alt(OFFSETS)}|${alt(FIXED)})${END}` +
    `(?:\\s+(\\d+|${alt(NUMS)})${END})?` +
    `(?:\\s+(${alt(SCALES)})${END})?` +
    `(\\s+बजे)?`,
  "gu",
);

export function normalizeHindiNumbers(text: string): string {
  return text.normalize("NFC").replace(PHRASE, (match, prefix: string, num?: string, scale?: string, baje = "") => {
    let value: number;
    if (prefix in FIXED) {
      if (num) return match;
      value = FIXED[prefix]!;
    } else {
      const n = num === undefined ? (scale ? 1 : undefined) : /^\d/.test(num) ? Number(num) : NUMS[num];
      if (n === undefined) return match;
      value = n + OFFSETS[prefix]!;
    }
    if (baje && !scale) {
      const h = Math.floor(value);
      const m = Math.round((value - h) * 60);
      return `${h || 12}:${String(m).padStart(2, "0")}${baje}`;
    }
    return (scale ? spellAmount(value * SCALES[scale]!) : String(value)) + baje;
  });
}

// A lakh and up goes out as small integers with scale words ("2 लाख 25 हज़ार",
// "2 करोड़ 50 लाख"), the way the model writes them itself. Every other format lost
// value in eval/: "2,50,000" was dropped (ta, te), "2.5 लाख" lost its decimal point
// (25 lakh), and "25000000" lost a zero (2,500,000).
function spellAmount(n: number): string {
  if (n < 1e5) return String(n);
  const parts: string[] = [];
  for (const [size, word] of [[1e7, "करोड़"], [1e5, "लाख"], [1e3, "हज़ार"]] as const) {
    if (n >= size) {
      parts.push(`${Math.floor(n / size)} ${word}`);
      n %= size;
    }
  }
  if (n) parts.push(String(n));
  return parts.join(" ").normalize("NFC");
}
