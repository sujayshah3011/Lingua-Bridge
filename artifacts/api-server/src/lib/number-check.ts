// Checks that a translation kept every number and the currency of its source.
// Sarvam mistranslates Indian amounts and times unpredictably (eval/: "2 करोड़ 50 लाख"
// → "250 million", "7:15" → "সাড়ে সাতটায়" = 7:30, "रुपये" → "rubles"), and small
// wording changes flip the result, so the translate route checks every output.
// Used by routes/sarvam.ts and by eval/ — keep them on this one implementation.

const WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};
const SCALES: Record<string, number> = {
  thousand: 1e3, lakh: 1e5, lakhs: 1e5, lac: 1e5, lacs: 1e5,
  crore: 1e7, crores: 1e7, million: 1e6, billion: 1e9,
};
const TIMES: Record<string, number> = { once: 1, twice: 2, thrice: 3 };
const FRACTIONS: Record<string, string> = { "½": ".5", "¼": ".25", "¾": ".75" };

// Scale words in Hindi, Tamil, Telugu and Bengali, mapped to English so one parser
// reads "125 ஆயிரம்", "2 లక్షల", "25 কোটি". Stems take any inflected ending.
const B = "(?<![\\p{L}\\p{M}])";
const REST = "[\\p{L}\\p{M}]*";
const NATIVE_SCALES: [RegExp, string][] = (
  [
    [`${B}(?:हज़ार|हजार|ஆயிர${REST}|వేల${REST}|হাজার${REST})`, " thousand "],
    [`${B}(?:लाख|லட்ச${REST}|లక్ష${REST}|লক্ষ${REST}|লাখ${REST})`, " lakh "],
    [`${B}(?:करोड़|करोड|கோடி${REST}|కోట్ల${REST}|కోటి${REST}|কোটি${REST})`, " crore "],
    [`${B}(?:மில்லியன்${REST}|మిలియన్${REST}|মিলিয়ন${REST})`, " million "],
    [`${B}सौ(?![\\p{L}\\p{M}])`, " hundred "],
  ] as const
).map(([re, word]): [RegExp, string] => [new RegExp(re.normalize("NFC"), "gu"), word]);

// Devanagari, Bengali, Gurmukhi, Gujarati, Odia, Tamil, Telugu, Kannada and
// Malayalam digit blocks all start at a code point ending in 6.
export const toAsciiDigits = (s: string) =>
  s.replace(
    /[०-९০-৯੦-੯૦-૯୦-୯௦-௯౦-౯೦-೯൦-൯]/g,
    (ch) => String((ch.codePointAt(0)! & 0xf) - 6),
  );

function normalize(s: string): string {
  let t = toAsciiDigits(s.normalize("NFC"))
    .toLowerCase()
    .replace(/(\d),(?=\d)/g, "$1")
    .replace(/(\d*)([½¼¾])/g, (_, d: string, f: string) => (d || "0") + FRACTIONS[f])
    .replace(/-/g, " ");
  for (const [re, word] of NATIVE_SCALES) t = t.replace(re, word);
  return t;
}

const wordValue = (w: string) => (/^\d/.test(w) ? parseFloat(w) : WORDS[w]!);
const W = `(\\d{1,2}|${Object.keys(WORDS).join("|")})`;
const TIME_PATTERNS: [RegExp, (h: string, m: string) => number][] = [
  [/\b(\d{1,2})[:.](\d{2})\b/g, (h, m) => (+m < 60 ? +h + +m / 60 : NaN)],
  [new RegExp(`\\bhalf past ${W}\\b`, "g"), (h) => wordValue(h) + 0.5],
  [new RegExp(`\\bquarter past ${W}\\b`, "g"), (h) => wordValue(h) + 0.25],
  [new RegExp(`\\bquarter to ${W}\\b`, "g"), (h) => wordValue(h) - 0.25],
  [new RegExp(`\\b${W} (fifteen|thirty|forty five)\\b`, "g"),
    (h, m) => wordValue(h) + ({ fifteen: 15, thirty: 30, "forty five": 45 } as Record<string, number>)[m]! / 60],
];

// "twenty" + "five" adds; "three" + "thirty" starts a new number.
const canAdd = (cur: number, v: number) =>
  cur === 0 || (cur % 100 === 0 && v < 100) || (cur % 10 === 0 && cur % 100 >= 20 && v < 10);

// Lenient (strict = false): each group also yields its parts ("18 thousand and 3"
// → 18003, 18000, 3), for "is this value present?" checks on a translation.
// Strict: one value per group, for reading what the source actually says.
function parseNumbers(t: string, strict: boolean): number[] {
  const out: number[] = [];
  let total = 0, cur = 0, open = false;
  // A word never extends a digit: "Rs. 700 and two meals" is 700 and 2, not 702.
  let curFromDigits = false;
  const flush = () => {
    if (open) strict ? out.push(total + cur) : out.push(total + cur, total, cur);
    total = cur = 0;
    open = curFromDigits = false;
  };
  const tokens = t.match(/\d+(?:\.\d+)?|[a-z]+|[^\sa-z\d]/g) ?? [];
  tokens.forEach((w, i) => {
    const next = tokens[i + 1];
    if (/^\d/.test(w)) {
      if (cur) flush();
      cur = parseFloat(w);
      open = curFromDigits = true;
    } else if (w in WORDS) {
      if ((cur && curFromDigits) || !canAdd(cur, WORDS[w]!)) flush();
      cur += WORDS[w]!;
      open = true;
      curFromDigits = false;
    } else if (strict && !open && (w === "hundred" || w in SCALES)) {
      // Source side: a scale word with no digit before it ("एक करोड़") is spelled-out
      // Hindi, which this check leaves to the model — don't invent "1 crore".
      flush();
    } else if (w === "hundred") {
      cur = (cur || 1) * 100;
      open = true;
    } else if (w in SCALES) {
      total += (cur || 1) * SCALES[w]!;
      cur = 0;
      open = true;
    } else if ((w === "half" && next !== "past") || (w === "quarter" && next !== "past" && next !== "to")) {
      cur += w === "half" ? 0.5 : 0.25;
      open = true;
    } else if (w in TIMES) {
      flush();
      out.push(TIMES[w]!);
    } else if (!(open && (w === "and" || w === "a" || w === "an"))) {
      flush();
    }
  });
  flush();
  return out;
}

export function extractNumbers(text: string): number[] {
  const t = normalize(text);
  const times = TIME_PATTERNS.flatMap(([re, value]) => [...t.matchAll(re)].map((m) => value(m[1]!, m[2]!)));
  return [...times, ...parseNumbers(t, false)].filter((v) => !Number.isNaN(v) && (v !== 0 || /\b(0|zero)\b/.test(t)));
}

// All digits in reading order, with spoken single digits ("four seven one nine")
// as numerals — for phone numbers and OTPs.
export const digitStream = (text: string) =>
  normalize(text)
    .replace(/\b(zero|one|two|three|four|five|six|seven|eight|nine)\b/g, (w) => String(WORDS[w]))
    .replace(/\D/g, "");

// A value the source states: a number, or a digit string (phone, OTP). label is
// how the source wrote it, for showing the speaker what to double-check.
export type Expected = { value: number; label: string } | { digits: string; label: string };

// Reads digits only — plain number words ("सात दिन") are left to the model, which
// had zero errors on them in eval/; fractional words are digits by now (hindi-numbers.ts).
export function sourceExpectations(source: string): Expected[] {
  const out: Expected[] = [];
  let t = normalize(source);
  t = t.replace(/\b(\d{1,2}):(\d{2})\b/g, (label, h: string, m: string) => {
    out.push({ value: +h + +m / 60, label });
    return " ; ";
  });
  // Runs of bare digit groups ("98765 43210", "4 7 1 9") are one phone number or OTP.
  t = t.replace(/\b\d+(?:\s+\d+)+\b(?!\s*(?:thousand|lakh|crore|million|hundred))/g, (label) => {
    out.push({ digits: label.replace(/\s/g, ""), label });
    return " ; ";
  });
  // Display only — never sent to the model, so Indian grouping is safe here.
  for (const value of parseNumbers(t, true)) out.push({ value, label: value.toLocaleString("en-IN") });
  return out;
}

type Item = number | string | { digits: string } | Expected;

// Items not found in any of the texts. Plain numbers, lowercase words (months)
// and { digits } come from eval/ cases; Expected comes from sourceExpectations.
export function missing<T extends Item>(expected: T[], texts: string[]): T[] {
  const nums = texts.flatMap(extractNumbers);
  const digits = texts.map(digitStream);
  const lower = texts.map((t) => t.toLowerCase());
  const hasValue = (v: number) => nums.some((n) => Math.abs(n - v) < 1e-6);
  return expected.filter((item) => {
    const e: Item = item;
    return typeof e === "number" ? !hasValue(e)
      : typeof e === "string" ? !lower.some((t) => t.includes(e))
      : "value" in e ? !hasValue(e.value)
      : !digits.some((d) => d.includes(e.digits));
  });
}

export const RUPEE = /रुपय|रुपए|रूपय|₹|\brs\.?\s*\d|rupee/i;
export const FOREIGN = /rubl|roubl|dollar|\$|рубл|ரூபிள்|டாலர்|రూబి|డాలర్|রুবেল|ডলার/i;

export interface NumberCheck {
  ok: boolean;
  missing: string[]; // source labels not found in the translation
  wrongCurrency: boolean;
  backTranslated: boolean;
}

// Tier 1 is free: look for every source value in the translation itself. Only if
// one is missing (e.g. written out in Tamil words) do we pay for a back-translation.
export async function checkNumbers(
  source: string,
  target: string,
  backTranslate: ((text: string) => Promise<string>) | null,
): Promise<NumberCheck> {
  const wrongCurrency = RUPEE.test(source) && FOREIGN.test(target);
  let lost = missing(sourceExpectations(source), [target]);
  let backTranslated = false;
  if (lost.length && backTranslate) {
    lost = missing(lost, [await backTranslate(target)]);
    backTranslated = true;
  }
  return { ok: !lost.length && !wrongCurrency, missing: lost.map((e) => e.label), wrongCurrency, backTranslated };
}
