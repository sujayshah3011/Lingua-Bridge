# BhaashAI (Lingua-Bridge): project context

The single source of truth for this repository. It is written so that any coding agent
(Claude, Codex, Cursor) or person can continue the project **without the earlier chat
history**. Last updated **2026-11-16**, from the code at `master` = `1057a5a` plus every
available session transcript.

**Status labels used throughout**
- **Verified:** built, and confirmed working by a test, a live API call or a run on a
  device or emulator. Where and when are noted.
- **Implemented:** in the code on `master`, but not confirmed end to end since it last
  changed.
- **Pending:** decided or required, not done yet.
- **Discussed:** talked about or planned only. There is no code for it.

No secrets are recorded here. Keys live in the AWS Lambda environment, and section 9
explains how to read them without printing them.

---

## 1. What the product is

**BhaashAI** (भाष्AI) is a two-person voice interpreter for Indian languages, aimed at
**clinics**. A Hindi-speaking patient and a Tamil-speaking nurse share one phone: one
person speaks, the other hears it in their own language, and back again.

**The differentiator is number safety.** Translation models handle Indian *words* well
but Indian *numbers* badly: fraction words (सवा +¼, साढ़े +½, पौने −¼, डेढ़ 1½, ढाई 2½),
lakh/crore amounts, and ₹ turning into dollars or rubles. BhaashAI wraps every
translation in three steps:

1. **Normalize** Hindi fraction and clock phrases to digits before translating.
2. **Verify** that every source number and the rupee currency survive in the output.
3. **Fall back** to the speaker's original wording if the check fails, and refuse to
   auto-speak anything it can't verify.

Verified turns become a bilingual **"What we agreed"** summary, shared via WhatsApp or the
share sheet. A **Bolna voice agent** can then phone the patient and read the verified lines
back in Hindi.

**One-line pitch (decided):** *"AI translators get 1 in 5 Indian numbers wrong. BhaashAI
verifies every number before speaking it, hands the patient a written summary of what was
agreed, and calls them the next day to remind them, in their language."*

**Persona (decided):** a clinic, with a Hindi-speaking migrant patient (for example in
Chennai) and Tamil-speaking staff. Secondary personas for pitches only: a loan agent
quoting an EMI, and a contractor agreeing a wage.

**Why not a generic translator (decided):** Google Live Translate and the government's
Bhashini already do generic voice translation. A generic translator is commoditised, so the
wedge is measurable number safety.

---

## 2. Context: hackathon and timeline

- **Event:** Bolna "Symphony Buildathon". Any project is allowed, but it must use voice.
  - Build window: Oct 15 to Nov 20, 2026.
  - Submission was due Oct 31: a GitHub link plus a pitch deck or video.
  - Top prize: a YC interview.
  - The judges are Bolna. They care about Indian languages, Hinglish, latency and cost per
    minute, across BFSI, e-commerce, recruitment and healthcare.
- **Project history:**
  - Mar 20, 2026: started as a general Replit-built translation app. The
    `attached_assets/` folder holds the prompts from that era.
  - Until Jul 24, 2026: about 80 commits before this effort.
  - Oct 21, 2026: the hackathon pivot work began.
- **Before Oct 21:** a DigitalOcean backend at `whale-app-2cd7y.ondigitalocean.app` had
  been deleted, so nothing was live.
  - `.do/app.yaml` and `render.yaml` are **leftover, unused** deploy configs.
  - The backend moved to AWS Lambda because that was the only option available.
- **Submitted:** the project was submitted using the GitHub link and a Google Drive video
  link, with the deck also on Drive (see section 12).
- **Shortlisted for an interview:** the Bolna Buildathon Interview was booked for
  **Tue Nov 10, 2026, 13:45–14:00 IST** on Google Meet. Interview prep was done in chat;
  this repo doesn't record the outcome.
- **Nov 14, 2026:** the user asked for help with a **Bolna "Voice Tank"** application form.
  - Applications had closed on Nov 13.
  - Draft answers were given, with the advice to check whether late entries are accepted.
  - The form asks what makes "your pitch agent" stand out. **BhaashAI has no pitch agent,
    only a reminder agent.** This was flagged.
  - It is unknown whether anything was submitted.

---

## 3. Repository layout

The repo is a pnpm monorepo (`pnpm@11.10.0`, workspace in `pnpm-workspace.yaml`).

```
artifacts/
  api-server/          Express 5 API (deployed to AWS Lambda)
    src/index.ts       listens on $PORT (required)
    src/app.ts         pino-http logging, cors, json; mounts router at /api
    src/routes/        index.ts, health.ts, sarvam.ts, stt.ts, elevenlabs.ts, reminder.ts
    src/lib/           hindi-numbers.ts, number-check.ts, firestore-credits.ts, pricing.ts,
                       reminder.ts (validation), firebase-admin.ts, elevenlabs.ts,
                       voice-map.ts, logger.ts
    src/middlewares/require-auth.ts   Firebase ID-token check → req.uid
    build.mjs          esbuild bundle → dist/index.mjs
  mobile/              Expo SDK 54 / React Native app (expo-router)
    app/               _layout.tsx (auth gate + Stack), (tabs)/…, conversation.tsx,
                       onboarding.tsx, topup.tsx (Usage), +not-found.tsx
    components/        AgreedSummary, NumberWarning, ConversationBubble, SpendLog,
                       WelcomeScreen, LanguagePickerModal, MicButton, TranslationOutput, …
    services/          api.ts, sarvam.ts, stt.ts, tts.ts, reminder.ts, consultations.ts,
                       firebase.ts, credits.ts (legacy, unused; see §14)
    constants/         languages.ts (11), pricing.ts, colors.ts
    context/AppContext.tsx   auth, credits, prefs (theme, voice gender, TTS provider)
    app.json, eas.json
lib/                   Replit-template workspace libs: api-spec (OpenAPI, health only),
                       api-zod, api-client-react, db (empty Drizzle schema). Only
                       api-zod is used, by routes/health.ts.
eval/                  Measurement harness and self-checks (see §8)
deploy/aws-lambda.sh   Idempotent Lambda deploy script
Dockerfile, .dockerignore   Lambda container image (Lambda Web Adapter)
firestore.rules, firestore.indexes.json
README.md              Public README (results, features, APK link)
docs/                  UNTRACKED on purpose: PLAN.md, SUBMISSION.md, DESIGN_PROMPTS.md
UI/                    UNTRACKED: 01-welcome-signin.png
app.json (root)        UNTRACKED stray file ({"expo": {}}) created by the Expo CLI; safe to delete
UX_UI_Refactor_Plan.md Older (pre-pivot) "warm" UI plan; colour tokens still in use
attached_assets/       Replit-era prompts and screenshots (historical)
.do/app.yaml, render.yaml   Dead deploy configs (DigitalOcean and Render)
```

**Untracked on purpose:** `docs/*` and `UI/` were never committed, because `docs/` holds
the pitch script and interview prep. The pitch video `docs/BhaashAI-pitch.mp4` was created
on Oct 24 but **is no longer in `docs/`**. It was uploaded to Drive (see §12), and its
local copy may have been moved or deleted.

---

## 4. Tech stack

| Layer | Technology | Notes |
|---|---|---|
| Mobile app | Expo SDK `~54.0.27`, React Native `0.81.5`, React 19.1, expo-router `~6.0.17`, TypeScript `~5.9.2` | New Architecture and React Compiler on. Fonts: Inter. Audio: `expo-av` (deprecated in favour of expo-audio; **migration is deliberately out of scope**) |
| App build | EAS Build, Expo account `sujayshah_3011` | Project ID `507d0181-845a-459a-871e-b11de74d92a3`. Profiles `preview` and `production` both build an **APK**; `development` builds a dev client |
| API | Node 22, Express `^5`, pino, multer, firebase-admin `^13` | Bundled by esbuild |
| Hosting | AWS Lambda **ap-south-1** (Mumbai) | Container image (`node:22-slim` plus `aws-lambda-adapter:0.9.1`), **arm64**, 1024 MB memory, 60 s timeout. Public **Function URL** with auth type NONE; the app authenticates with Firebase tokens |
| Auth and DB | Firebase project **`bhaashai`** | Email/password auth; Firestore holds `users` and `transactions` |
| Speech-to-text | Sarvam **`saaras:v4`** | `POST /speech-to-text` |
| Translation | Sarvam **`sarvam-translate:v1`** | `POST /translate`, `mode: "formal"` |
| Text-to-speech | Sarvam **`bulbul:v3`** (default) | ElevenLabs `eleven_flash_v2_5` is optional |
| Voice agent | **Bolna** | `POST https://api.bolna.ai/call`. Agent `e91814f0-bc71-4fad-a0eb-f1e143411395` (Hindi) |
| Eval | Plain Node scripts (`node --experimental-strip-types`) | No test framework |

**Live API base:** `https://2axm7sju4jczjb7uyntvti6kee0gdawy.lambda-url.ap-south-1.on.aws/api`.
This is hard-coded as the fallback in `artifacts/mobile/services/api.ts` and set in
`eas.json`.

**The AWS account is shared** with another project ("korestack"). Only touch resources
named `lingua-bridge-api*`. The local AWS CLI is **v1**, which lacks
`--invoked-via-function-url`; that step only runs on first creation, and it's already done.

---

## 5. API reference (all under `/api`)

Every route except `/healthz` and `/elevenlabs/voices` requires
`Authorization: Bearer <Firebase ID token>` (`requireAuth`, which sets `req.uid`).

**Billing (`artifacts/api-server/src/lib/firestore-credits.ts`):**
- Credits are charged **before** the upstream call, in a Firestore transaction
  (`chargeUser`).
- If the upstream call fails, they're refunded with `refundUser`, which writes a
  `refund_<type>` transaction.
- A 402 response means the balance was too low: `{error: "INSUFFICIENT_CREDITS", credits}`.

| Route | Purpose | Price to user |
|---|---|---|
| `GET /healthz` | `{status:"ok"}`; also the Lambda readiness check | none |
| `POST /stt` (multipart `file`, `language_code`, `duration_seconds`) | Sarvam `saaras:v4` `/speech-to-text`. App sends `audio/x-m4a` | 2 × Sarvam cost per second (min 0.5 s) |
| `POST /sarvam/translate` | Normalize → translate → number check → fallback. Returns Sarvam's body plus `number_check`, `normalized_input` (only if changed) and `credits` | 2 × ₹20 per 10k chars |
| `POST /sarvam/tts` | Sarvam `/text-to-speech` passthrough (`bulbul:v3`) | 2 × ₹15 per 10k chars |
| `POST /sarvam/transliterate` | Passthrough | 2 × ₹20 per 10k chars |
| `POST /sarvam/detect-language` | Sarvam `/text-lid` (it was 404ing on `/detect-language` before a fix) | none |
| `POST /elevenlabs/tts` | ElevenLabs stream endpoint; premade voices Sarah (female) and Adam (male) | 2 × ($0.18 per 1k chars × 83) |
| `GET /elevenlabs/voices` | Lists voices | none |
| `POST /reminder-call` | Bolna outbound call (see §7.3) | flat **₹10**, refunded if Bolna rejects |

**Pricing is mirrored** in `api-server/src/lib/pricing.ts` and
`mobile/constants/pricing.ts`. Keep the two files in sync. Users pay 2× Sarvam's cost price.

**`number_check` shape:**
```ts
{ ok: boolean, missing: string[], verified: string[], wrongCurrency: boolean, backTranslated: boolean }
```

---

## 6. The number-safety mechanism (core IP)

### 6.1 Normalizer: `api-server/src/lib/hindi-numbers.ts` (`normalizeHindiNumbers`)

The normalizer runs only when the source language is `hi-IN`. It works on the
NFC-normalized text, so both spellings of nukta letters (ज़, ढ़) match.

**Fraction phrases.** The prefixes are सवा, साढ़े and पौने (offsets) and डेढ़ and ढाई
(fixed values). Each can be followed by an optional number (digits, or the words 1–20,
the tens, and 25/35/45/55), an optional scale (सौ, हज़ार, लाख, करोड़) and an optional बजे.
- **Clock times:** "पौने नौ बजे" becomes "8:45 बजे".
- **Bare सवा** means 1¼. Bare साढ़े and पौने are left unchanged.
- **Amounts of a lakh and above** are spelled out as "1 लाख 25 हज़ार" or "2 करोड़ 50 लाख".

**This amount format was chosen by experiment.** The alternatives lost value:
- `2,50,000` was dropped in Tamil and Telugu.
- `2.5 लाख` lost its decimal point, a 10× error.
- `25000000` lost a zero.

**Clock words** (added in PR #6): "दस बजकर पैंतालीस मिनट" becomes "10:45", and "नौ बजे"
becomes "9 बजे". Only times are converted, so idioms like "एक दिन" stay as they are.

**Ceiling:** the word table covers only 1–20, the tens and 25/35/45/55. This is marked
with a `ponytail:` comment.

### 6.2 Checker: `api-server/src/lib/number-check.ts`

**One implementation is shared by the route and `eval/`.**

**`sourceExpectations(source)`** reads what the source states:
- clock times;
- runs of digit groups, read as one phone number or OTP;
- digit numbers with scale words.

It reads **digits only**. Spelled-out Hindi number words such as "सात दिन" are left to the
model.

**`extractNumbers` and `missing`** read the translation:
- Digits from 9 Indic scripts are converted with one code-point trick: each block's zero
  ends in 6.
- Native scale words are mapped to English: ஆயிரம், లక్ష, কোটি, மில்லியன் and others.
- English number words, "half past" and "quarter to", and once/twice/thrice are understood.
- Lenient parsing also yields the parts of each number.

**Currency:** `RUPEE` matches the source, and `FOREIGN` matches the target (rubles,
dollars, `$`, and their Tamil, Telugu and Bengali spellings).

**`checkNumbers` runs in two tiers:**
1. **Free:** look for every expected value directly in the translation.
2. **Paid, only if tier 1 misses something:** back-translate the output to English and look
   again. This happens on about 5% of translations. It isn't billed to the user, and it's
   skipped when the target is English.

### 6.3 Route logic: `routes/sarvam.ts` `/translate`

1. Normalize the input, then charge for it.
2. Translate with the client's body and the normalized `input`.
3. Check the numbers. **If the check fails and normalization changed the input**, translate
   the raw input too. Keep that version if its check passes; it's checked against the
   normalized input's numbers. This catches normalization causing a "$2500" error.
4. If the check itself throws, `number_check` is omitted. **The client treats a missing
   `number_check` as unverified, never as passed.**

### 6.4 App behaviour

**Green ✓ chips** (`VerifiedNumbers`) appear for each verified label.

**An amber warning** (`NumberWarning`) reads: *"Couldn't confirm 7:15 in the translation.
Please confirm with the speaker."*, plus a note when the currency may have changed.

**A "You said: …" read-back line** shows the normalized input, so a mishearing can be
caught.

**When `numberCheck.ok === false` in Clinic:**
- the app gives a warning haptic;
- audio is synthesized but **not auto-played**;
- the replay button can still play it.

### 6.5 Known limits (state them honestly)

- The check verifies that numbers are **present**, not their meaning or position. In one
  Tamil test, "empty stomach until 8:45" came back as "finish eating by 8:45 at night" and
  passed. Swapped numbers would also pass.
- Spelled-out number words in the source aren't checked.
- Back-translation uses the same model, so its errors can be correlated with the original
  translation's.
- Normalization exists **for Hindi source only**.

---

## 7. Features and implementation status

### 7.1 App screens

**Tab bar order:** Clinic · Records · Phrases · Translate. Voice and Settings are hidden
routes (`href: null`). On Android, the bar is the classic custom bar; on iOS 26+, the app
uses `NativeTabs` when liquid glass is available.

| Feature | Where | Status |
|---|---|---|
| **Sign in / sign up with email**; ₹100 welcome credit; password reset | `components/WelcomeScreen.tsx`, `context/AppContext.tsx` (`createUserDocIfNew` writes `users/{uid}` with credits 100 and a welcome transaction) | Verified on the emulator, Oct 23–24 |
| Google sign-in | Web only (`signInWithPopup`); hidden on phones | Implemented (web); intentionally unavailable on mobile |
| **Stay signed in across restarts** | `services/firebase.ts`: `initializeAuth` with `getReactNativePersistence(AsyncStorage)` via a typed cast | Verified Oct 24 (force-close and relaunch on the emulator), PR #19 |
| Onboarding | `app/onboarding.tsx` (AsyncStorage key `onboarding_completed`); copy says 11 languages | Implemented |
| **Clinic tab** (two-person conversation; the app opens here at `/`) | `app/(tabs)/index.tsx` re-exports `app/conversation.tsx` | Verified on the emulator, Oct 24 |
| ↳ Defaults | Hindi (A, patient) ↔ Tamil (B, staff) | Verified |
| ↳ Split screen | Two halves; each shows the last 3 turns and scrolls to the newest | Verified (scroll fix in PR #17) |
| ↳ Action row | **Summary · Hands-free · New** | Verified |
| ↳ Quick phrases for A | 5 Hindi chips; same translate → check → speak path as speech (`translateAndSpeak`) | Verified |
| ↳ One-time ✓ hint | AsyncStorage key `bhaashai_hint_checks_seen` | Verified |
| ↳ Recording limit | Auto-stops at 10 s | Implemented |
| ↳ **Hands-free** | Silence detection in `services/stt.ts` (`SPEECH_DB -35`, `SILENCE_DB -45`, `SILENCE_MS 1200`). After a *verified* translation is spoken, the other side's mic opens | Implemented; **not tuned on a real phone** (the plan's W4 acceptance is not met) |
| ↳ Auto-save to Records | `services/consultations.ts`: AsyncStorage key `bhaashai_consultations`, newest 50, audio stripped, **device only** | Verified |
| **What we agreed** (Summary modal) | `components/AgreedSummary.tsx`: turns with numbers, ✓ or ⚠ per turn, plain-text Share (RN `Share`) | Verified on the emulator (share sheet not exercised on WhatsApp) |
| **Reminder call UI** | In the Summary: +91 number, "Tomorrow 10:00 AM" or "Call now", a required consent checkbox, "Book reminder call · ₹10". Sends only verified lines, in the patient's language (A's `normalizedInput ?? original`, B's translation). Only offered when the patient language is `hi-IN` | Implemented; **a real call is still unverified** (§7.3) |
| **Records tab** | `app/(tabs)/history.tsx`: saved sessions with ✓ chips and a "to confirm" count; tap to reopen the Summary; delete with confirmation | Verified on the emulator |
| **Phrases tab** ("Clinic phrases") | `app/(tabs)/phrasebook.tsx`: 5 categories (Fasting & tests, Medicines, Appointments, Costs, Emergency), 17 Hindi phrases translated **live** with the number check and Play. Target defaults to Tamil | Verified (साढ़े पाँच → ✓ 5:30) |
| **Translate tab** | `app/(tabs)/translate.tsx`: typed text, auto-detect, the same checks; a gear opens Settings | Verified (layout) |
| **Usage** (route `/topup`, opened from the credit pill) | `app/topup.tsx`: balance, unit costs, "For clinics" note, recent activity (`components/SpendLog.tsx`, Firestore `transactions` with `uid ==` ordered by `timestamp desc`, which needs the composite index) | Verified Oct 24 after the index was created; refunds labelled "Refund · <what>" (PR #18) |
| In-app payments and top-ups | none | **Out of scope** (deliberately not built) |
| Settings | `app/(tabs)/settings.tsx`: theme (system, light, dark), voice gender, TTS provider, wallet bar (shows the share remaining), sign out | Verified (layout and wallet bar) |
| Voice tab (single-speaker) | `app/(tabs)/voice.tsx` | Hidden from the bar (duplicates Clinic); code kept |

### 7.2 Languages

**Exactly 11 languages** work end to end (`constants/languages.ts`): Bengali, English,
Gujarati, Hindi, Kannada, Malayalam, Marathi, Odia, Punjabi, Tamil and Telugu.

**12 were removed (PR #16).** Sarvam translates all 23 languages, but `bulbul:v3` returns
HTTP 400 for these 12: Assamese, Bodo, Dogri, Kashmiri, Konkani, Maithili, Manipuri,
Nepali, Sanskrit, Santali, Sindhi and Urdu. The ElevenLabs model only speaks Hindi and
Tamil among Indian languages, so it can't cover them either. Saved choices of a removed
language are ignored.

**Sarvam voices** (`services/tts.ts` `SPEAKER_MAP`): all 22 voice/language pairs were
checked live.
- The old female voice `niharika` was invalid for Tamil, Malayalam and Bengali, so female
  speech silently failed there.
- It was replaced with `kavitha` (Tamil), `shruti` (Malayalam) and `ishita` (Bengali).

### 7.3 Bolna reminder call

**Server (`artifacts/api-server/src/routes/reminder.ts`, validation in
`artifacts/api-server/src/lib/reminder.ts`):** the request is rejected
unless all of these hold:
- `consent === true`;
- `language === "hi-IN"`;
- `phone` matches `^\+91[6-9]\d{9}$`;
- there are 1–10 `lines`, each 200 characters or fewer;
- the optional `scheduledAt` is in the future and no more than 7 days ahead.

It charges ₹10, then sends this to Bolna `/call`:
```
{ agent_id, recipient_phone_number, scheduled_at?,
  user_data: { clinic_name: "BhaashAI", instructions: "1. …\n2. …" } }
```
It returns `{execution_id, status, credits}` and refunds on any failure. It returns 503 if
`BOLNA_API_KEY` or `BOLNA_AGENT_ID` isn't set.

**Agent `e91814f0-bc71-4fad-a0eb-f1e143411395`** ("BhaashAI clinic reminder (Hindi)") was
created through the API on Oct 23:
- **Hears:** Sarvam `saaras:v4`.
- **Speaks:** `bulbul:v3`, voice Suhani.
- **Thinks:** `gpt-4.1-mini` at low temperature.
- **Prompt:** read the lines exactly; never change a number; give no medical advice; keep
  the call under 2 minutes.

**Bolna account:** on Oct 23 the wallet showed **500.0** (most likely the $5 signup credit).
It allows 2 concurrent calls and uses Bolna's shared caller numbers.

**Status:** Implemented and deployed (PR #9). **No real call has ever been placed:** 0
executions when last checked on Nov 9. The user said they would book a test call to their
own number from the app. Whether that happened is **unknown**.

---

## 8. Measurement (eval/)

**Data:** 69 self-written Hindi sentences:

| File | Sentences | Used for |
|---|---|---|
| `cases.json` | 36 | development |
| `holdout.json` | 13 | held out |
| `validation.json` | 20 | validation |
| `currency-probe.json` | 4 | currency only |

Each sentence is translated into English, Tamil, Telugu and Bengali, which gives 276
translations. **Every error was checked by hand.**

**Scripts:**
- `eval/run.mjs` measures translation. `NORMALIZE=1` applies the server pipeline, `CASES=`
  picks the set, and `LIMIT` / `TARGETS` narrow the run. Responses are cached in
  `eval/out/raw.json`, so re-runs only pay for new calls.
- `eval/stt.mjs` measures speech recognition: each sentence is spoken with Sarvam TTS
  (`neha` and `aditya`), giving 138 clips, which are then transcribed by three STT setups.
  `CACHED_ONLY=1` makes no calls. The `.wav` files are git-ignored.
- `eval/*.test.mjs` are self-checks for the number check, the normalizer and reminder
  validation. **All 3 pass (exit 0) as of 2026-11-16.**
- Reports live in `eval/out/*.md`, including `report-stt.md` and the
  `unseen-validation-*.md` files.

**Translation results (quote only these):**

| Set | Translations | Model alone | With BhaashAI | Remaining errors flagged |
|---|---|---|---|---|
| Validation (unseen on first run) | 80 | 22 wrong | 6 on the first run (4 flagged), then **0 after fixes**, so the set is no longer unseen | — |
| Held-out | 52 | 20 | 1 | 1 of 1 |
| Development | 144 | 9 | 4 (rubles) | 4 of 4 |
| **Total** | **276** | **51 (18%)** | **5** | **5 of 5; 0 false alarms** |

**Always disclose the overfitting caveat.** The honest unseen figure is 22 wrong → 6
wrong, with 4 of the 6 flagged.

**Speech recognition results** (138 synthetic clips; a clip fails if it loses a number):

| Setup | Clips that lost a number |
|---|---|
| `saaras:v2.5` on `/speech-to-text-translate` (the original app call) | 13 |
| `saaras:v3` transcribe | 19 |
| **`saaras:v4`** | **1** (a duration left as words) |

The original call returned **English**, with numbers already wrong (पौने नौ came back as
9:45). This finding drove the switch to v4 (PR #5).

**Example failures with the model alone:**
- पौने छह बजे → "4:30 PM" in all four languages.
- सवा लाख रुपये → "125 thousand rubles".
- ढाई करोड़ → "25 million dollar".
- पौने तीन लाख → 3.25, 4.5 or 35 lakh.

**Limits:**
- The sentences were self-written, with Hindi as the only source language.
- Speech was synthetic, not real phone audio.
- No end-to-end **latency** has been measured. The only measured timing is a Lambda cold
  start of about 3.6 s, then 0.14 s once warm, for `/healthz`.

---

## 9. Environment, secrets and how to run

**Secrets (never commit or print them):**

| Variable | Where | Notes |
|---|---|---|
| `SARVAM_API_KEY` | Lambda env | The user gave a new key on Oct 23 after the old account ran out of credit (HTTP 402) |
| `ELEVENLABS_API_KEY` | Lambda env | Required by the deploy script. An old, dead key exists in git history (returns 401) |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY_B64` | Lambda env | `FIREBASE_PRIVATE_KEY` is also accepted. The deploy script derives them from the service-account JSON in `~/Downloads/` (path in `docs/PLAN.md` §6) |
| `BOLNA_API_KEY`, `BOLNA_AGENT_ID` | Lambda env | Optional; reminder calls return 503 without them |
| `PORT` | Dockerfile sets 8080 | Required by `src/index.ts` |

**Client config:** `EXPO_PUBLIC_*` (API URL plus Firebase web config) are public by design
and live in `artifacts/mobile/.env`, which is git-ignored, and in `eas.json`. The Firebase
web API key is not a secret; Firestore rules enforce access. `.env.example` lists the
variable names.

**Read a key without printing it:**
```bash
SARVAM_API_KEY="$(aws lambda get-function-configuration --region ap-south-1 \
  --function-name lingua-bridge-api --query 'Environment.Variables.SARVAM_API_KEY' --output text)"
```

**Self-checks (free):**
```bash
node --experimental-strip-types eval/number-check.test.mjs
node --experimental-strip-types eval/hindi-numbers.test.mjs
node --experimental-strip-types eval/reminder.test.mjs
```

**Typecheck:**
```bash
(cd artifacts/api-server && npx tsc -p tsconfig.json --noEmit)
(cd artifacts/mobile && npx tsc -p tsconfig.json --noEmit)
```
As of 2026-11-16, the mobile app is clean. The API has the **2 known, pre-existing** errors,
both harmless at runtime because esbuild doesn't typecheck:
- `health.ts`: TS6305, because `lib/api-zod` dist isn't built.
- `stt.ts:59`: TS2322, `Buffer` to `BlobPart`.

**Eval (paid only for uncached calls; about ₹25 per new 20-sentence set):**
```bash
SARVAM_API_KEY=... CASES=validation.json NORMALIZE=1 node --experimental-strip-types eval/run.mjs
```

**Run the API locally:**
```bash
pnpm --filter @workspace/api-server run build
PORT=8080 node artifacts/api-server/dist/index.mjs
```
This needs the env vars above.

**Run the app:**
```bash
cd artifacts/mobile && pnpm exec expo start
```

**Deploy the API:** this is the **only** way server changes go live. The script builds an
arm64 image and pushes it to ECR, creates or updates the Lambda, and ensures the Function
URL exists.
```bash
SARVAM_API_KEY=… ELEVENLABS_API_KEY=… FIREBASE_SA_JSON=/path/to/sa.json \
  [BOLNA_API_KEY=… BOLNA_AGENT_ID=…] ./deploy/aws-lambda.sh
```
- `docs/PLAN.md` §6 shows how to feed the keys in from the live Lambda env.
- The script asserts that the env stays under Lambda's 4 KB limit.
- **Every redeploy must pass `BOLNA_*`, or the reminder call is disabled.**
- Afterwards, delete untagged ECR images:
  `aws ecr list-images --region ap-south-1 --repository-name lingua-bridge-api --filter tagStatus=UNTAGGED`

**Build an APK:**
```bash
cd artifacts/mobile && eas build -p android --profile preview --non-interactive
```
- This uses the Expo account `sujayshah_3011`, and the free queue has taken 40–60 minutes.
- **Expo artifact links expire after about 13 days.** Publish the APK as a GitHub Release
  instead:
```bash
gh release create <tag> BhaashAI.apk --target <full 40-char SHA>
```
  A short SHA fails with "target_commitish is invalid".

**Firestore:**
- `firestore.rules` is published.
  - Users can read only their own doc.
  - A user can create their doc only with exactly `credits == 100`,
    `totalCredited == 100` and `totalDebited == 0`.
  - Updates can't touch `credits`, `totalCredited`, `totalDebited`, `plan` or `isActive`.
  - There's no delete rule, which prevents re-creating the doc for a second welcome credit.
  - Transactions can be read and created only by their owner. The server writes with the
    Admin SDK, which bypasses the rules.
- The composite index on `transactions` (`uid` ascending, `timestamp` descending) was
  **created by the user in the Firebase console on Oct 24** and is defined in
  `firestore.indexes.json`.

---

## 10. Release and distribution

- **Current APK:** GitHub Release **v1.0.0**:
  https://github.com/sujayshah3011/Lingua-Bridge/releases/latest/download/BhaashAI.apk
  - Built from `02d6885`.
  - 99,290,544 bytes.
  - SHA-256 `35e9873fdfd12c21c7e1d42c966e164cc0ce83b434974cfba1d713595bc0a90a`.
  - An anonymous download was verified on Nov 9.
  - It has the same app code as the build verified on the emulator; `02d6885` only added a
    README change on top.
  - **This exact file has not been installed on a physical phone.**
- The README links to it twice (PR #21). No Expo artifact links remain in it.
- **GitHub repo:** `sujayshah3011/Lingua-Bridge`, **public** since Oct 22. Its history was
  scanned; the only leaked key is the dead ElevenLabs key.
- **Bundle ID / package:** `com.bhaashai.app`; scheme `bhaashai`. iOS isn't built and is
  out of scope.

---

## 11. Change history (pivot era, Oct 21 – Nov 9, 2026)

Every change landed through a PR from its own branch, merged into `master`.

| PR | Change |
|---|---|
| #2 | `number-safety`: normalizer, number check, fallback, eval harness |
| #3 | ElevenLabs voices: the per-language table held 9 non-existent IDs, replaced by 2 premade voices |
| #4 | EAS project moved to the `sujayshah_3011` Expo account (a `chirag3011` account was tried first) |
| #5 | W0 STT eval; switch to `saaras:v4`; W1 `verified` and `normalized_input`; W2 Summary; W3 clinic phrases; W4 hands-free |
| #6 | Clock times spoken as words |
| #7 | Onboarding and welcome copy match the app |
| #8 | README with STT results, features and APK link |
| #9, #10 | W5 Bolna reminder call, plus docs |
| #11, #13, #20 | APK link updates (Expo links, now expired) |
| #12 | Clinic is the first tab and the screen the app opens on |
| #14 | **W8:** every screen tells the clinic story (Records, Clinic phrases, Usage, 4-tab bar, Voice hidden) |
| #15 | Fixes from running the APK on the emulator: sign-in pill double box, status bar contrast, slim chips, other speaker's half empty |
| #16 | Only the 11 languages that work end to end; female voices fixed (`niharika`) |
| #17 | Hindi half scroll, wallet bar showing used instead of remaining, activity-list index |
| #18 | Refund labels "Refund · <what>" |
| #19 | Stay signed in across restarts |
| #21 | APK on GitHub Releases |

**Also done outside git:**
- AWS resources were created: ECR repo, IAM role `lingua-bridge-api-role`, the Lambda,
  the Function URL, and a CloudWatch log group.
- `keep-warm.yml` was deleted; it pinged a dead URL.
- Docker images were cleared on the Mac to save disk space.
- An Android 15 emulator (arm64 system image, about 5–7 GB) was installed on the Mac for
  testing. **It's still there.** Deleting it was offered and never answered.

---

## 12. Submission and pitch assets

- **Pitch deck** (12 slides, "Every number, checked."), with four real emulator
  screenshots:
  - claude.ai artifact: https://claude.ai/artifact/TRuuaMtKSxh34Hf8hYqEy2 (private unless
    shared).
  - PDF on Drive: https://drive.google.com/file/d/16J-5j0V9T_WIbzLbohj94_Hk-WlczwgH/view?usp=sharing
- **Pitch video** (2 min 33 s, 1080p, 6.1 MB):
  https://drive.google.com/file/d/1CfhTFRCHA7_F4sSTo_Ys_YIBpiHOq13D/view?usp=sharing
  - The narration is Sarvam's Indian English synthetic voice, which cost ₹3.53.
  - The demo was recorded from the real APK on the emulator.
- **`docs/SUBMISSION.md`:** form values, the video script and Q&A prep. It was written
  Oct 24, so some lines predate later changes (for example, it says to book the test call
  on camera).
- **`docs/DESIGN_PROMPTS.md`:** mockup prompts for 6 screens.
  - Style: saffron `#FF6B00`, terracotta `#D4764A`, cream `#FFF8F0`, sage `#84A98C`
    (verified), amber `#F59E0B` (warnings), navy `#0D1B2A`, Inter type, rounded 14–16 px
    cards, Feather icons.
- **Interview prep** (Nov 9–10) was given in chat only. Key honesty points the user agreed
  to keep:
  - It supports 11 languages, not "all".
  - It's for clinic conversations, not clinical trials.
  - There's no AI visit summary; the Summary is a record of the turns with numbers.
  - There's no Google comparison benchmark.
  - It's built with heavy use of AI coding tools.
  - Don't claim users, latency figures, or a working Bolna call until one is tested.

---

## 13. Decisions and working rules (do not re-litigate)

**From the user:**
1. **Deep-think before every code change.** Read the files, trace the real flow, then make
   the smallest change that matches the surrounding style. Add no new dependencies unless
   needed.
2. **Report every cost**, before or right after spending it: Sarvam, ElevenLabs, Bolna, AWS
   and EAS. The user asked for this explicitly.
3. **Measure, never assume.** Every accuracy claim must come from `eval/`. If a set was used
   to tune a fix, it's no longer "unseen"; say so.
4. **Never print secrets.** Never commit `.env`, keys or the service-account JSON.
5. **One branch and one PR per work item.**
   - Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
   - PR bodies end with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
   - Leave one runnable self-check for any non-trivial logic.
6. **Ask before anything outward-facing:** real phone calls (only to the user's own number,
   with consent), publishing, or changes to live config (Firebase console, Bolna).
7. **Agents must not enter credentials into the live Firebase app.** The user signs in
   themselves.

**Product and technical decisions:**
- The persona is a clinic; the wedge is number safety; Hindi is the source language for
  normalization.
- Translation `mode: "formal"` everywhere. The colloquial mode (W6) was never tested and
  must be gated by eval first.
- Patient conversations (Records) stay **on the device only**. Server-side history is out
  of scope.
- **Never auto-speak unverified numbers.** A missing `number_check` means unverified.
- The STT MIME type must stay `audio/x-m4a`, recorded with `Audio.Recording.createAsync`
  and `HIGH_QUALITY`.
  - `audio/m4a` and `audio/wav` are rejected by Sarvam.
  - The two-step recorder setup fails in Expo Go.
  - See the header comment in `services/stt.ts`.
- **Out of scope:** iOS build, Play Store listing, payments and top-ups, the expo-audio
  migration, normalizers for other languages, server-side history, a new design system,
  inbound Bolna numbers, and two-phone bridged interpretation.

---

## 14. Known issues and technical debt

**Unverified features:**
1. **The Bolna reminder call has never been verified with a real call**, the most important
   gap. It's unknown whether the agent reads the lines in Hindi without changing numbers.
2. **The hands-free thresholds were never tuned on a real phone.**
3. **The APK from the v1.0.0 release hasn't been installed on a physical device.** The
   emulator test used a build of the same code.

**Code and config debt:**

4. `artifacts/mobile/services/credits.ts` is **legacy client-side charging**. Nothing
   imports it, and the published Firestore rules would reject its writes. Safe to delete.
5. `services/api.ts` `fetchCredits()` calls `/sarvam/credits`, which doesn't exist, and
   nothing uses it. It also sends an `x-device-id` header the server ignores.
6. The API has 2 pre-existing typecheck errors (§9).
7. `lib/` holds unused Replit-template packages, apart from `api-zod` for health.
   `.do/app.yaml` and `render.yaml` are dead configs.
8. `app.json` (root) is a stray, untracked file.
9. **`expo-router`'s plugin `origin` is still `https://replit.com/`** in `app.json`. It's
   harmless for the APK.

**Product and data gaps:**

10. **Lambda cold start is about 3.6 s.** For demos, open the app a minute early.
11. **Records are capped at the newest 50** in a single AsyncStorage entry (a `ponytail:`
    ceiling). Move them to SQLite if needed.
12. **Reminder calls cost a flat ₹10**, not metered per minute (a `ponytail:` note). Bolna's
    real cost is about ₹8–10 per minute by its published rates, and hasn't been measured.
13. **The deploy script requires `ELEVENLABS_API_KEY`**, even though ElevenLabs is
    optional.
14. **`docs/SUBMISSION.md` and `docs/PLAN.md` are partly stale.** PLAN's "Status" and
    "Latest APK" lines predate the GitHub Release, and PLAN's code map still describes STT
    as legacy v2.5.

---

## 15. Remaining work

**Pending (user):**
- Place the real Bolna test call to your own number: Clinic → Summary → number → Call now
  → consent. Then check the execution in the Bolna dashboard and its cost.
- Install the v1.0.0 APK on a phone and run the device script in `docs/PLAN.md` §7.
- Decide whether to delete the Android emulator files (about 5–7 GB).
- Follow up on the Bolna interview result and the Voice Tank application, which were
  outside the repo.

**Candidate next steps (Discussed only, no code):**
- **Run the number check inside live Bolna calls:** check the agent's outgoing text against
  the known facts in `user_data` before speech, and regenerate or say "let me confirm" on a
  mismatch. This was the pitched roadmap.
- Tamil and Bengali reminder agents. Today the server rejects anything but `hi-IN`.
- Real clinic audio and a few pilot clinics, to measure STT on noisy phone speech.
- Measure end-to-end latency, then consider Lambda provisioned concurrency and streaming.
- Eval-gate the colloquial translation mode (W6).
- Clean up the debt in §14, items 4–9.

---

## 16. Information this document could not confirm

- **Whether a real Bolna call has happened since Nov 9.** No live API check was made while
  writing this.
- **The outcome of the Nov 10 interview, and whether the Voice Tank form was submitted.**
- **Where `docs/BhaashAI-pitch.mp4` and the narration source** (`video/narration.json`,
  created during the session outside the repo) are now. Only the Drive copy is confirmed.
- **Current balances and spend:** Sarvam, Bolna wallet, ElevenLabs, and AWS since Oct 21.
  - Known one-off costs: about ₹3 (STT eval TTS), about ₹9 (STT eval), ₹3.53 (video
    narration), a few rupees of app testing, and free EAS builds.
  - AWS was estimated at about $0.03/month for ECR storage, with Lambda in the free tier.
- **Live state of Firestore rules and indexes.** They were published and created on
  Oct 22–24 and haven't been rechecked.
- **Pre-Oct 21 history** is reconstructed from git and `attached_assets/` only. No
  transcript of that work was available.
