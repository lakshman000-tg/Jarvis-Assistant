# Workspace

## Overview

pnpm workspace monorepo using TypeScript. JARVIS – an AI Voice Assistant web app.

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
- **Frontend**: React + Vite + Tailwind + Framer Motion
- **AI**: Replit AI Integrations (OpenAI via proxy) — gpt-5.2 for chat, TTS via OpenAI audio

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server (chat, TTS, conversations)
│   └── jarvis/             # React + Vite JARVIS UI
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   ├── db/                 # Drizzle ORM schema + DB connection
│   ├── integrations-openai-ai-server/  # OpenAI server-side integration (TTS, chat)
│   └── integrations-openai-ai-react/   # OpenAI React hooks
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## JARVIS Features

- **Voice Input**: Browser Speech Recognition API (mic button + wake word "Hey JARVIS")
- **Built-in Commands**: open youtube, tell time, search google, open gmail, play music, play telugu songs, etc.
- **AI Chat**: GPT-5.2 via Replit AI Integrations, streaming SSE responses
- **TTS**: OpenAI TTS (onyx voice) via backend `/api/openai/tts` endpoint
- **Chat UI**: Dark navy/cyan JARVIS HUD theme, chat bubbles, typing animation
- **Database**: PostgreSQL conversations + messages tables

## API Endpoints

- `GET /api/healthz` — health check
- `GET/POST /api/openai/conversations` — list/create conversations
- `GET/DELETE /api/openai/conversations/:id` — get/delete conversation
- `GET/POST /api/openai/conversations/:id/messages` — list/send messages (SSE streaming)
- `POST /api/openai/tts` — text-to-speech (returns audio/mpeg)

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all lib packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck`
- `emitDeclarationOnly` — only `.d.ts` files during typecheck
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Database

- Conversations table: id, title, createdAt
- Messages table: id, conversationId, role, content, createdAt
- Run migrations: `pnpm --filter @workspace/db run push`
