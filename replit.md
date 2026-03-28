# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── mobile/             # BhaashAI — Expo React Native app
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts
├── pnpm-workspace.yaml     # pnpm workspace
├── tsconfig.base.json      # Shared TS options
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## BhaashAI Mobile App (`artifacts/mobile`)

Real-Time Indian Language Translator using Sarvam AI REST API.

### Features

**V1 — Text Translation**
- 23 Indian languages + English (all 22 official Indian languages)
- Real-time translation with 600ms debounce via Sarvam AI API
- Language auto-detection toggle
- Formal / Colloquial mode toggle
- Transliteration toggle (romanized script)
- Translation history persisted via AsyncStorage (swipe to delete)
- Secure API key storage via expo-secure-store (web fallback to AsyncStorage)
- Dark mode fully supported
- iOS Liquid Glass tabs (iOS 26+)

**V2 — Voice Translation (Voice tab)**
- Record audio with expo-av (HIGH_QUALITY preset → m4a/caf)
- Send to Sarvam `/speech-to-text-translate` REST API for transcription (saaras:v3)
- Auto-translate transcript via `/translate`
- TTS playback via `/text-to-speech` (bulbul:v3) with per-language voice map
- Language-specific voice map (meera/arjun/valli/pavithra/shreya/sobha etc.)
- Audio written to device cache and played via expo-av Sound
- Web: informational message (voice capture not supported on web)

**V3 — Conversation Mode (`/conversation` stack screen)**
- Dual-speaker interface (top half Speaker A, bottom half Speaker B flipped 180°)
- Each speaker taps their mic → records → STT → translate → TTS plays for opposite speaker
- Chat bubble UI with original + translation, timestamps
- Speaker A bubbles: saffron, Speaker B: navy
- Language picker for each speaker independently
- Navigate from Voice tab header button

**V4 — Production Polish**
- Onboarding carousel (3 slides, first-launch only, AsyncStorage flag)
  - Slide 1: Speak any Indian language
  - Slide 2: Instant real-time translation
  - Slide 3: Enter Sarvam API key (inline input)
- Phrasebook tab: 30 pre-loaded phrases × 6 categories × 8 major languages (offline, no API)
  - Categories: Greetings, Food, Travel, Emergency, Numbers, Shopping
  - Star/favourite phrases, copy to clipboard, per-language display
- Usage dashboard in Settings: chars translated, audio seconds, estimated cost (₹30/10K chars)
  - Reset counters button
- app.json: bundle identifiers, mic permissions, Android RECORD_AUDIO

### Tab Structure (5 tabs)
| Tab | Screen |
|-----|--------|
| Translate | Text translator (index.tsx) |
| Voice | Voice recording + TTS (voice.tsx) |
| Phrases | Offline phrasebook (phrasebook.tsx) |
| History | Translation history (history.tsx) |
| Settings | API key, theme, usage, about (settings.tsx) |

### Key Files
- `app/_layout.tsx` — Root layout; checks onboarding, registers conversation route
- `app/(tabs)/_layout.tsx` — 5-tab nav with NativeTabs (iOS 26+) / ClassicTabs fallback
- `app/(tabs)/index.tsx` — Text translate screen
- `app/(tabs)/voice.tsx` — Voice tab (mic + STT + TTS)
- `app/(tabs)/phrasebook.tsx` — Offline phrasebook
- `app/(tabs)/history.tsx` — Translation history
- `app/(tabs)/settings.tsx` — Settings: Account (Google Sign-In), Credits, Theme, Translation, About
- `app/onboarding.tsx` — First-launch onboarding carousel (stack screen)
- `app/conversation.tsx` — Dual-speaker conversation mode (stack modal)
- `context/AppContext.tsx` — Global state (user, auth, languages, history, credits, theme)
- `services/firebase.ts` — Firebase app + auth initialization
- `services/api.ts` — API base URL, device ID (uses Firebase UID when signed in), credit fetch
- `services/sarvam.ts` — Sarvam AI API client (translate, detect, transliterate)
- `services/stt.ts` — Speech-to-text (multipart upload to API proxy)
- `services/tts.ts` — Text-to-speech (REST, writes WAV to cache, returns URI)
- `data/phrases.ts` — 30 pre-loaded phrases in 8 languages across 6 categories
- `components/MicButton.tsx` — Animated pulsing mic button with dual ring effect
- `components/ConversationBubble.tsx` — Chat bubble for conversation mode
- `constants/languages.ts` — All 23 language definitions with native scripts
- `constants/colors.ts` — COLORS token + Colors.light/dark theme objects
- `metro.config.js` — Metro config with blockList for Firebase pnpm temp files

### Firebase Auth
- **Package**: `firebase@12.11.0`, `expo-auth-session@7.0.10`, `expo-web-browser`
- **Flow**: Google OAuth via `expo-auth-session/providers/google` → `signInWithCredential` → Firebase
- **Web Client ID**: stored as `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` env var
- **Firebase config**: stored as `EXPO_PUBLIC_FIREBASE_*` env vars (all 7 values)
- **Credit integration**: when signed in, Firebase UID is used as `x-device-id`; credits keyed per UID on server
- **Settings screen**: Account section shows profile photo/name/email when signed in, Google Sign-In button when not

### Color Palette
- Primary: `#FF6B00` (deep saffron orange)
- Background light: `#F8F9FA`
- Background dark: `#0A0F18` (deep navy)
- Text dark: `#0D1B2A`

### Sarvam AI API
- Base URL: `https://api.sarvam.ai`
- Auth: `api-subscription-key` header
- Endpoints: `/translate`, `/detect-language`, `/transliterate`, `/speech-to-text-translate`, `/text-to-speech`
- STT model: `saaras:v3`
- TTS model: `bulbul:v3`
- Translate model: `sarvam-translate:v1`

### Storage Keys
- `bhaashai_history` — AsyncStorage: translation history (max 200)
- `bhaashai_prefs` — AsyncStorage: source/target lang, theme, formal mode, recents
- `bhaashai_usage` — AsyncStorage: chars translated, audio seconds
- `bhaashai_starred_phrases` — AsyncStorage: starred phrase IDs
- `onboarding_completed` — AsyncStorage: boolean flag
- `sarvam_api_key` — SecureStore (web: AsyncStorage with `__secure_` prefix)

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references
