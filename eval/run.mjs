// Baseline: how often does Sarvam translation lose or change a number?
// Each Hindi case goes through the same /translate request the app sends, then
// back to English; a value counts as lost only if it is missing from BOTH the
// translation and the back-translation (so the failure rate errs low).
// Responses are cached in eval/out/raw.json — re-runs only pay for new calls.
//
//   SARVAM_API_KEY=... node --experimental-strip-types eval/run.mjs
//     LIMIT=2 TARGETS=en-IN,ta-IN   narrow the run
//     CASES=holdout.json            the held-out set
//     NORMALIZE=1                   apply the server's Hindi number normalization first,
//                                   and score the server's runtime number check
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { normalizeHindiNumbers } from "../artifacts/api-server/src/lib/hindi-numbers.ts";
import { FOREIGN, RUPEE, checkNumbers, missing } from "../artifacts/api-server/src/lib/number-check.ts";

const KEY = process.env.SARVAM_API_KEY;
if (!KEY) throw new Error("set SARVAM_API_KEY");
const NORMALIZE = process.env.NORMALIZE === "1";
const prep = NORMALIZE ? normalizeHindiNumbers : (s) => s;
// CASES=holdout.json runs the held-out set (sentences never used to tune the normalizer).
const CASES = process.env.CASES ?? "cases.json";
const tag = (CASES === "cases.json" ? "" : `-${CASES.replace(/\.json$/, "")}`) + (NORMALIZE ? "-normalized" : "");
const TARGETS = (process.env.TARGETS ?? "en-IN,ta-IN,te-IN,bn-IN").split(",");
const cases = JSON.parse(await readFile(new URL(CASES, import.meta.url), "utf8"))
  .slice(0, Number(process.env.LIMIT) || undefined);

const outDir = new URL("out/", import.meta.url);
await mkdir(outDir, { recursive: true });
const cachePath = new URL("raw.json", outDir);
const cache = JSON.parse(await readFile(cachePath, "utf8").catch(() => "{}"));
let paidChars = 0;

async function translate(input, src, tgt) {
  const key = `${src}>${tgt}: ${input}`;
  if (key in cache) return cache[key];
  for (let attempt = 1; ; attempt++) {
    const res = await fetch("https://api.sarvam.ai/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-subscription-key": KEY },
      // Mirrors translateText() in artifacts/mobile/services/sarvam.ts (conversation mode).
      body: JSON.stringify({
        input,
        source_language_code: src,
        target_language_code: tgt,
        mode: "formal",
        model: "sarvam-translate:v1",
        enable_preprocessing: true,
      }),
    });
    if ((res.status === 429 || res.status >= 500) && attempt < 4) {
      await new Promise((r) => setTimeout(r, 2000 * attempt));
      continue;
    }
    const data = await res.json();
    if (!res.ok) throw new Error(`${src}>${tgt} ${res.status}: ${JSON.stringify(data)}`);
    paidChars += input.length;
    cache[key] = data.translated_text;
    await writeFile(cachePath, JSON.stringify(cache, null, 1));
    return cache[key];
  }
}

const rows = [];
for (const c of cases) {
  const sent = prep(c.hi);
  for (const tgt of TARGETS) {
    const target = await translate(sent, "hi-IN", tgt);
    const back = tgt === "en-IN" ? target : await translate(target, tgt, "en-IN");
    const wrongCurrency = RUPEE.test(c.hi) && FOREIGN.test(target);
    // The server's runtime check, fed the cached back-translation instead of a new call.
    const check = NORMALIZE ? await checkNumbers(sent, target, tgt === "en-IN" ? null : async () => back) : null;
    rows.push({ id: c.id, tgt, hi: c.hi, sent, target, back, expect: c.expect, lost: missing(c.expect, [target, back]), wrongCurrency, check });
  }
}

const isBad = (r) => r.lost.length > 0 || r.wrongCurrency;

// How the runtime check (number-check.ts) scores against the hand-labelled errors above.
function checkReport() {
  const flagged = rows.filter((r) => !r.check.ok);
  const caught = flagged.filter(isBad);
  const missed = rows.filter((r) => isBad(r) && r.check.ok);
  const falseAlarms = flagged.filter((r) => !isBad(r));
  const backTranslated = rows.filter((r) => r.check.backTranslated).length;
  const row = (r) => `- ${r.id} → ${r.tgt}: ${r.target}${r.tgt === "en-IN" ? "" : ` (back: ${r.back})`} — check said ${JSON.stringify(r.check)}`;
  return [
    "## Runtime number check",
    "",
    "| Real errors | Caught | Missed | False alarms | Needed a back-translation |",
    "|---|---|---|---|---|",
    `| ${failed.length} | ${caught.length} | ${missed.length} | ${falseAlarms.length}/${rows.length - failed.length} | ${backTranslated}/${rows.length} |`,
    "",
    ...(missed.length ? ["Missed:", ...missed.map(row), ""] : []),
    ...(falseAlarms.length ? ["False alarms:", ...falseAlarms.map(row), ""] : []),
  ];
}
const failed = rows.filter(isBad);
const lines = [
  `# Number accuracy ${NORMALIZE ? "with Hindi number normalization" : "baseline"} — Sarvam translate (hi-IN source, ${cases.length} cases)`,
  "",
  "| Target | Cases | Values lost | Wrong currency | Failure rate |",
  "|---|---|---|---|---|",
  ...TARGETS.map((tgt) => {
    const rs = rows.filter((r) => r.tgt === tgt);
    const lost = rs.filter((r) => r.lost.length).length;
    const currency = rs.filter((r) => r.wrongCurrency).length;
    const bad = rs.filter(isBad).length;
    return `| ${tgt} | ${rs.length} | ${lost} | ${currency} | ${((100 * bad) / rs.length).toFixed(1)}% |`;
  }),
  "",
  `**Overall: ${failed.length}/${rows.length} translations lost a value or changed the currency.**`,
  "",
  ...(NORMALIZE ? checkReport() : []),
  "## Failures",
  ...failed.map((r) =>
    [
      "",
      `### ${r.id} → ${r.tgt} — ${[r.lost.length ? `lost ${JSON.stringify(r.lost)}` : null, r.wrongCurrency ? "wrong currency" : null].filter(Boolean).join(", ")}`,
      `- Hindi: ${r.hi}`,
      r.sent === r.hi ? null : `- Sent as: ${r.sent}`,
      `- Translation: ${r.target}`,
      r.tgt === "en-IN" ? null : `- Back to English: ${r.back}`,
    ].filter(Boolean).join("\n"),
  ),
];
await writeFile(new URL(`results${tag}.json`, outDir), JSON.stringify(rows, null, 1));
await writeFile(new URL(`report${tag}.md`, outDir), lines.join("\n") + "\n");
console.log(lines.slice(0, TARGETS.length + 6).join("\n"));
console.log(`\nNew characters billed this run: ${paidChars} (~₹${((paidChars * 20) / 10000).toFixed(2)} at ₹20/10k chars)`);
console.log(`Full report: eval/out/report${tag}.md`);
