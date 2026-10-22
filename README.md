# भाष्AI (BhaashAI)

Voice translation between Indian languages that **won't silently get a number wrong**.

Speak Hindi, the other person hears Tamil, Telugu, Bengali or English, and back. It's
built for conversations where a wrong number does harm: a clinic telling a patient when to
fast, a loan officer quoting an EMI, a contractor agreeing a daily wage.

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

**Limits:** 69 sentences that we wrote ourselves, Hindi as the source language, and text
rather than audio (speech recognition is a separate source of error). Numbers spelled
out as words in the source (`सात दिन`) are left to the model. It had no errors on them
here, but the check can't see them.

## Reproduce

```bash
node --experimental-strip-types eval/number-check.test.mjs    # self-checks, free
node --experimental-strip-types eval/hindi-numbers.test.mjs
SARVAM_API_KEY=... CASES=validation.json NORMALIZE=1 node --experimental-strip-types eval/run.mjs
```

Responses are cached in `eval/out/raw.json`, so re-running costs nothing. A new set of
20 sentences costs about ₹25 of Sarvam credit.

## Architecture

- **App** ([`artifacts/mobile`](artifacts/mobile)): Expo / React Native. Text, voice and
  two-person conversation modes, plus an offline phrasebook. Firebase email sign-in, ₹100
  free credit.
- **API** ([`artifacts/api-server`](artifacts/api-server)): Express on AWS Lambda
  (Mumbai), behind a Function URL. It verifies Firebase tokens and charges credits
  atomically in Firestore, refunding if the upstream call fails. Sarvam handles
  speech-to-text and translation, and Sarvam Bulbul or ElevenLabs handles speech output.
- **Deploy:** `./deploy/aws-lambda.sh` (needs `SARVAM_API_KEY`, `ELEVENLABS_API_KEY`
  and `FIREBASE_SA_JSON`).
- **Firestore rules:** [`firestore.rules`](firestore.rules). Balances are server-only.
