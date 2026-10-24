# भाष्AI (BhaashAI)

Voice translation between Indian languages that **won't silently get a number wrong**.

Speak Hindi, the other person hears Tamil, Telugu, Bengali or English, and back. It's
built for conversations where a wrong number does harm: a clinic telling a patient when to
fast, a loan officer quoting an EMI, a contractor agreeing a daily wage.

**Try it (Android):** [download the APK](https://expo.dev/artifacts/eas/SFF9Y40umdD_OyylJ9ZF8rifNWZUI36knjiGh8A0v10.apk) and sign up with any email to get ₹100 of
free credit.

## The problem we measured

Translation models handle Indian *words* well and Indian *numbers* badly. We sent
realistic Hindi sentences through Sarvam's translation API (the same request our app
makes) into English, Tamil, Telugu and Bengali, and checked every number by hand.

On **20 sentences we had never tested before** (80 translations), the model alone got
**22 of 80 wrong (28%)**:

| Spoken Hindi | Means | Came back as |
|---|---|---|
| पौने छह बजे तक रिपोर्ट मिल जाएगी | report by 5:45 | "by **4:30** PM" (all 4 languages) |
| सवा आठ बजे इंजेक्शन लगेगा | injection at 8:15 | 8:15 lost in all 4 languages |
| पौने तीन लाख का लोन बाकी है | ₹2.75 lakh outstanding | 3.25 / 4.5 / **35** lakh |
| ढाई करोड़ रुपये का प्रोजेक्ट | ₹2.5 crore | "25 million **dollar** project" |
| सवा लाख रुपये | ₹1.25 lakh | "125 thousand **rubles**" |

The errors cluster on the fraction words Indians use every day (सवा +¼, साढ़े +½,
पौने −¼, डेढ़, ढाई) and on lakh/crore amounts. Plain digits almost never fail.

## What we built

Three steps on the server, around every translation
([`hindi-numbers.ts`](artifacts/api-server/src/lib/hindi-numbers.ts),
[`number-check.ts`](artifacts/api-server/src/lib/number-check.ts)):

1. **Normalize.** Rewrite Hindi fraction phrases as digits before translating:
   `पौने नौ बजे` → `8:45 बजे`, `सवा लाख` → `1 लाख 25 हज़ार`. The amount format was
   chosen by experiment: `2,50,000` got dropped, `2.5 लाख` lost its decimal point
   (10× error) and `25000000` lost a zero.
2. **Verify.** Read every number in the source (times, lakh/crore amounts, phone numbers,
   OTPs) and find it in the translation. That includes Tamil, Telugu and Bengali digits
   and scale words (ஆயிரம், లక్ష, কোটি). Only if that's inconclusive do we pay for one
   back-translation to English (≈5% of translations). Also flag ₹ turning into $ or rubles.
3. **Fall back.** If the check fails, translate the speaker's original wording too and
   keep whichever version passes.

If both fail, the app **doesn't speak the translation**. It shows *"Couldn't confirm 7:15
in the translation. Please confirm with the speaker."* and the speaker can replay it once
confirmed.

### Speech recognition, measured too

The numbers have to survive speech recognition before translation even starts. We spoke
all 69 test sentences with Sarvam's text-to-speech (one female and one male voice) and
transcribed them three ways ([`eval/stt.mjs`](eval/stt.mjs),
[report](eval/out/report-stt.md)):

| Speech-to-text | Clips that lost a number |
|---|---|
| `saaras:v2.5` via `/speech-to-text-translate` (our original call) | 13 of 138 |
| `saaras:v3`, transcribe mode | 19 of 138 (spells digits out as words) |
| **`saaras:v4`** (what the app uses now) | **1 of 138** (a duration, left as words by design) |

The original call didn't transcribe at all: it returned **English**, with the numbers
already wrong. For example, `पौने नौ बजे` came back as "9:45" and `पौने दो लीटर` as "2.75
liters". v4 writes the Hindi down as spoken, so the normalizer and the check see the
real words.

## In the app

Four tabs, all built around the clinic conversation:

- **Clinic** (the app opens here): two people, one phone, Hindi ↔ Tamil by default and any
  of 11 Indian languages (every one with speech in and out).
  - Every verified number gets a green **✓ chip** (`✓ 8:45`), and the speaker sees
    **"You said: 8:45"**, so a mishearing can be caught.
  - A turn whose numbers couldn't be verified is shown with a warning and **isn't
    auto-spoken**.
  - Labelled **Summary · Hands-free · New** buttons. Clinic quick phrases run the same
    path as speech.
  - **Hands-free:** a pause ends your turn, and after a verified translation is spoken the
    other person's mic opens.
- **What we agreed** (Summary): a bilingual record of every turn that had a number,
  shareable on WhatsApp.
  - **Reminder call ([Bolna](https://www.bolna.ai)):** book a call to the patient for
    tomorrow at 10:00 or right away. A Bolna voice agent phones them in Hindi and reads
    back **only the verified lines, word for word**. It needs the patient's consent and a
    +91 mobile number, and costs a flat ₹10.
- **Records:** every clinic conversation is saved on the phone as it happens. Tap one to
  reopen "What we agreed", share it, or book the call later.
- **Phrases:** ready-made clinic sentences (fasting, medicines, appointments, costs,
  emergency), translated live with the same number check, and playable aloud.
- **Translate:** typed text with the same checks. **Usage** (the credit pill) shows the
  balance, what each action costs, and every charge and refund.

## Results

| Set | Translations | Model alone | With BhaashAI | Errors left that were flagged |
|---|---|---|---|---|
| Validation (unseen when first run) | 80 | 22 wrong | 6 wrong → **0** after fixes* | — |
| Held-out | 52 | 20 wrong | 1 wrong | 1 of 1 |
| Development | 144 | 9 wrong | 4 wrong (rubles) | 4 of 4 |
| **Total** | **276** | **51 wrong (18%)** | **5 wrong** | **5 of 5** |

Wrong means a number or the currency changed, and every case was checked by hand.

\*The first, unseen run with our system left 6 errors, and the check flagged 4 of them.
We then fixed what it revealed: bare `सवा`, and normalization itself causing "$2500".
After that, 0 remained, but the set is no longer unseen.
[Raw unseen reports](eval/out/unseen-validation-normalized.md).

Across all sets, the check raised **0 false alarms** on correct translations. Every
sentence, translation and back-translation is in [`eval/out/`](eval/out/).

**Limits:**
- **The sentences:** 69 that we wrote ourselves, with Hindi as the source language.
- **The audio:** speech recognition was measured on synthetic speech, which is cleaner
  than a phone mic in a noisy clinic.
- **Numbers spelled out as words:** in the source (`सात दिन`), these are left to the
  model. It had no errors on them here, but the check can't see them.

## Reproduce

```bash
node --experimental-strip-types eval/number-check.test.mjs    # self-checks, free
node --experimental-strip-types eval/hindi-numbers.test.mjs
SARVAM_API_KEY=... CASES=validation.json NORMALIZE=1 node --experimental-strip-types eval/run.mjs
```

Responses are cached in `eval/out/raw.json`, so re-running costs nothing. A new set of
20 sentences costs about ₹25 of Sarvam credit.

## Try it

1. Install the [Android APK](https://expo.dev/artifacts/eas/SFF9Y40umdD_OyylJ9ZF8rifNWZUI36knjiGh8A0v10.apk). You may need to allow installs from your browser.
2. Sign up with any email to get ₹100 of free credit.
3. The app opens on the **Clinic** tab. Tap the clinic phrases, or speak, and watch for the ✓ chips.
   Then open the clipboard icon for "What we agreed".

## Architecture

- **App** ([`artifacts/mobile`](artifacts/mobile)): Expo / React Native. Text, voice and
  two-person conversation modes, plus an offline phrasebook. Firebase email sign-in, ₹100
  free credit.
- **API** ([`artifacts/api-server`](artifacts/api-server)): Express on AWS Lambda
  (Mumbai), behind a Function URL. It verifies Firebase tokens and charges credits
  atomically in Firestore, refunding if the upstream call fails. Sarvam handles
  speech-to-text (`saaras:v4`) and translation, and Sarvam Bulbul or ElevenLabs handles
  speech output.
- **Voice agent:** a Bolna agent (Hindi) is triggered by `POST /api/reminder-call` through
  Bolna's `/call` API. The verified lines are passed as `user_data` into the agent's
  prompt.
- **Deploy:** `./deploy/aws-lambda.sh` (needs `SARVAM_API_KEY`, `ELEVENLABS_API_KEY`
  and `FIREBASE_SA_JSON`; optional `BOLNA_API_KEY` and `BOLNA_AGENT_ID`).
- **Firestore rules:** [`firestore.rules`](firestore.rules). Balances are server-only.
