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
- **23 Indian languages + English** supported (all 22 official Indian languages)
- **Real-time translation** with 600ms debounce via Sarvam AI API
- **Language auto-detection** toggle
- **Formal / Colloquial** mode toggle
- **Transliteration** toggle (romanized script)
- **Translation history** persisted via AsyncStorage (swipe to delete)
- **Secure API key storage** via expo-secure-store
- **Dark mode** fully supported
- **iOS Liquid Glass tabs** (iOS 26+)

### Key Files
- `app/_layout.tsx` — Root layout with AppProvider, QueryClient, fonts
- `app/(tabs)/_layout.tsx` — 3-tab nav (Translate, History, Settings) with NativeTabs/ClassicTabs
- `app/(tabs)/index.tsx` — Main translate screen
- `app/(tabs)/history.tsx` — Translation history with swipe-to-delete
- `app/(tabs)/settings.tsx` — API key, theme, preferences
- `context/AppContext.tsx` — Global app state (API key, languages, history, theme)
- `services/sarvam.ts` — Sarvam AI API client (translate, detect, transliterate)
- `constants/languages.ts` — All 23 language definitions with native scripts
- `constants/colors.ts` — Saffron (#FF6B00) primary, navy text, light/dark themes

### Color Palette
- Primary: `#FF6B00` (deep saffron orange)
- Background light: `#F8F9FA`
- Background dark: `#0A0F18` (deep navy)
- Text dark: `#0D1B2A`

### API
- Base URL: `https://api.sarvam.ai`
- Auth: `api-subscription-key` header
- Endpoints: `/translate`, `/detect-language`, `/transliterate`

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references
