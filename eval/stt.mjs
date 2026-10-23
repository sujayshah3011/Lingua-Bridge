// W0: does speech recognition keep the numbers? Every Hindi case is spoken by
// Sarvam TTS (one female, one male voice), then transcribed by the app's current
// STT call and by the newer models; a transcript passes if every expected value
// survives. Synthetic speech is cleaner than a real phone mic, so treat these as
// a best case. Audio and transcripts are cached in eval/out/stt/.
//
//   SARVAM_API_KEY=... node --experimental-strip-types eval/stt.mjs
//   CACHED_ONLY=1 ...   score what is cached, make no calls
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { normalizeHindiNumbers } from "../artifacts/api-server/src/lib/hindi-numbers.ts";
import { missing } from "../artifacts/api-server/src/lib/number-check.ts";

const CACHED_ONLY = process.env.CACHED_ONLY === "1";
const KEY = process.env.SARVAM_API_KEY;
if (!KEY && !CACHED_ONLY) throw new Error("set SARVAM_API_KEY");
const SARVAM = "https://api.sarvam.ai";
const SPEAKERS = ["neha", "aditya"];

// Each variant mirrors one real request shape.
const VARIANTS = {
  // Exactly what artifacts/api-server/src/routes/stt.ts sends today.
  "v2.5 (current app)": { path: "/speech-to-text-translate", fields: { model: "saaras:v2.5", mode: "transcribe", with_timestamps: "false", audio_type: "wav" } },
  "v3 transcribe": { path: "/speech-to-text", fields: { model: "saaras:v3", mode: "transcribe" } },
  "v4": { path: "/speech-to-text", fields: { model: "saaras:v4" } },
};

// Scoring reads digits and scale words already (number-check.ts); these cover the
// spelled-out Hindi numbers and months that appear in the cases, so a transcript
// that keeps "दो बार" or "15 नवंबर" as words is still scored fairly.
const HINDI_WORDS = {
  एक: 1, दो: 2, तीन: 3, चार: 4, पाँच: 5, पांच: 5, छह: 6, सात: 7, आठ: 8, नौ: 9, दस: 10,
  ग्यारह: 11, बारह: 12, अठारह: 18, बीस: 20, तीस: 30, चालीस: 40, पचास: 50,
};
const HINDI_MONTHS = { नवंबर: "november", सितंबर: "september", अक्टूबर: "october", दिसंबर: "december" };
const readable = (hi) => {
  let t = normalizeHindiNumbers(hi);
  for (const [w, v] of Object.entries({ ...HINDI_WORDS, ...HINDI_MONTHS }))
    t = t.replace(new RegExp(`(?<![\\p{L}\\p{M}])${w.normalize("NFC")}(?![\\p{L}\\p{M}])`, "gu"), ` ${v} `);
  return t;
};
const lost = (c, text) => missing(c.expect, [readable(text)]);

const cases = [];
for (const f of ["cases.json", "holdout.json", "validation.json"])
  cases.push(...JSON.parse(await readFile(new URL(f, import.meta.url), "utf8")));

// The scorer must pass every original sentence, or a failure below means nothing.
const scorerMisses = cases.filter((c) => lost(c, c.hi).length);
if (scorerMisses.length) throw new Error(`scorer can't read: ${scorerMisses.map((c) => c.id).join(", ")}`);

const dir = new URL("out/stt/", import.meta.url);
await mkdir(dir, { recursive: true });
const cachePath = new URL("transcripts.json", dir);
const cache = JSON.parse(await readFile(cachePath, "utf8").catch(() => "{}"));
let ttsChars = 0, sttSeconds = 0;

async function retrying(fn) {
  for (let attempt = 1; ; attempt++) {
    const res = await fn();
    if ((res.status === 429 || res.status >= 500) && attempt < 4) {
      await new Promise((r) => setTimeout(r, 2000 * attempt));
      continue;
    }
    const data = await res.json();
    if (!res.ok) throw new Error(`${res.status}: ${JSON.stringify(data)}`);
    return data;
  }
}

async function speak(c, speaker) {
  const file = new URL(`${c.id}-${speaker}.wav`, dir);
  const cached = await readFile(file).catch(() => null);
  if (cached || CACHED_ONLY) return cached;
  const data = await retrying(() =>
    fetch(`${SARVAM}/text-to-speech`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-subscription-key": KEY },
      body: JSON.stringify({ text: c.hi, language_code: "hi-IN", model: "bulbul:v3", speaker, speech_sample_rate: 16000 }),
    }),
  );
  ttsChars += c.hi.length;
  const wav = Buffer.from(data.audios[0], "base64");
  await writeFile(file, wav);
  return wav;
}

async function transcribe(name, wav, cacheKey) {
  const key = `${name}|${cacheKey}`;
  if (key in cache) return cache[key];
  if (CACHED_ONLY) return null;
  const { path, fields } = VARIANTS[name];
  const data = await retrying(() => {
    const form = new FormData();
    form.append("file", new Blob([wav], { type: "audio/wav" }), "clip.wav");
    form.append("language_code", "hi-IN");
    for (const [k, v] of Object.entries(fields)) form.append(k, v);
    return fetch(`${SARVAM}${path}`, { method: "POST", headers: { "api-subscription-key": KEY }, body: form });
  });
  sttSeconds += (wav.length - 44) / 32000; // 16 kHz mono 16-bit
  cache[key] = data.transcript ?? "";
  await writeFile(cachePath, JSON.stringify(cache, null, 1));
  return cache[key];
}

const rows = [];
for (const c of cases) {
  for (const speaker of SPEAKERS) {
    const wav = await speak(c, speaker);
    if (!wav) continue;
    for (const name of Object.keys(VARIANTS)) {
      const transcript = await transcribe(name, wav, `${c.id}-${speaker}`);
      if (transcript === null) continue;
      rows.push({ id: c.id, speaker, model: name, hi: c.hi, transcript, lost: lost(c, transcript) });
    }
  }
}

const lines = [
  `# Speech recognition vs numbers — ${cases.length} Hindi cases × ${SPEAKERS.length} synthetic voices`,
  "",
  "| STT | Clips | Lost a value | Failure rate |",
  "|---|---|---|---|",
  ...Object.keys(VARIANTS).map((m) => {
    const rs = rows.filter((r) => r.model === m);
    const bad = rs.filter((r) => r.lost.length).length;
    return `| ${m} | ${rs.length} | ${bad} | ${((100 * bad) / rs.length).toFixed(1)}% |`;
  }),
  "",
  "A clip fails if an expected value is missing from the transcript (after the server's own",
  "Hindi number normalization). Speech is synthetic (Sarvam bulbul:v3, 16 kHz).",
  "",
  "## Failures",
  ...rows.filter((r) => r.lost.length).map((r) =>
    `- **${r.model}** ${r.id} (${r.speaker}) lost ${JSON.stringify(r.lost)}\n  - said: ${r.hi}\n  - heard: ${r.transcript}`),
];
await writeFile(new URL("../report-stt.md", dir), lines.join("\n") + "\n");
await writeFile(new URL("../results-stt.json", dir), JSON.stringify(rows, null, 1));
console.log(lines.slice(0, Object.keys(VARIANTS).length + 4).join("\n"));
console.log(`\nBilled this run: TTS ${ttsChars} chars (~₹${((ttsChars * 15) / 10000).toFixed(2)}), STT ${(sttSeconds / 60).toFixed(1)} min (~₹${((sttSeconds / 3600) * 30).toFixed(2)})`);
