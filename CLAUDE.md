# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PageLM is an open-source AI-powered education platform that transforms study materials (PDFs, documents) into interactive learning experiences including quizzes, flashcards, podcasts, and structured notes. It is a full-stack TypeScript application with a Node.js backend and React frontend.

## Architecture

### Backend (`backend/`)
- **Entry Point**: `backend/src/core/index.ts`
- **Router**: `backend/src/core/router.ts` - Registers all API routes
- **Routes**: `backend/src/core/routes/*.ts` - Express routes for each feature
- **Services**: `backend/src/services/` - Core business logic (chat, quiz, flashcards, etc.)
- **Utils**: `backend/src/utils/` - Helper functions including LLM integrations
- **Config**: `backend/src/config/env.ts` - Environment configuration with multiple fallback paths for .env

Key architectural patterns:
- WebSocket streaming for real-time features (chat, podcast generation)
- Keyv-based JSON storage (default) with optional vector database support
- Multi-provider LLM support (Gemini, OpenAI, Claude, Grok, Ollama) via LangChain
- File upload handling with Busboy for document processing

### Frontend (`frontend/`)
- **Entry**: `frontend/src/main.tsx`
- **App**: `frontend/src/App.tsx`
- **Pages**: `frontend/src/pages/` - Route-level components
- **Components**: `frontend/src/components/` - 70+ UI components including specialized learning components
- **Hooks**: `frontend/src/hooks/` - Custom React hooks for data fetching and utilities
- **Lib**: `frontend/src/lib/` - API clients and utilities
- **i18n**: `frontend/src/i18n/` + `frontend/src/locales/` - Internationalization (EN/ZH)

Key architectural patterns:
- Vite for build tooling
- React Query (TanStack Query) for server state management
- TailwindCSS for styling
- Component library with variants and TypeScript strict typing

## Common Commands

### Development
```bash
# Start backend dev server (with hot reload via nodemon)
npm run dev

# Build backend for production
npm run build

# Start production server
npm start
```

### Testing
```bash
# Run all tests (backend + frontend)
npm test

# Backend tests only
npm run test:backend
npm run test:backend:watch        # Watch mode
npm run test:backend:coverage     # With coverage report

# Frontend tests only
npm run test:frontend
npm run test:frontend:watch       # Watch mode
npm run test:frontend:coverage    # With coverage report

# E2E tests with Playwright
npm run test:e2e
npm run test:e2e:ui               # Interactive UI mode
npm run test:e2e:headed           # With visible browser

# Run a single test file
npx vitest run backend/tests/unit/services/chat.test.ts
```

### Running Single Tests
```bash
# Backend single test
npx vitest run backend/tests/unit/services/chat.test.ts

# Frontend single test
npx vitest run frontend/tests/unit/components/Button.test.tsx

# With watch mode for development
npx vitest backend/tests/unit/services/chat.test.ts
```

### Docker
```bash
# Start full stack with Docker Compose
docker-compose up

# Backend only
docker-compose up backend

# Frontend only
docker-compose up frontend
```

## Environment Configuration

The application requires a `.env` file in the project root. Key variables:

**Server**: `PORT`, `VITE_BACKEND_URL`, `VITE_FRONTEND_URL`
**LLM Provider**: `LLM_PROVIDER` (gemini|openai|claude|grok|ollama), `EMB_PROVIDER`
**API Keys**: `gemini`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `XAI_API_KEY`, `OPENROUTER_API_KEY`
**Database**: `db_mode` (json|sqlite|postgres)
**TTS**: `TTS_PROVIDER` (edge|google|eleven), voice configuration

The env loader (`backend/src/config/env.ts`) searches multiple locations for the .env file:
- Current working directory
- Parent directory (for backend/ subdirectory)
- `/var/www/workspace/PageLM/` and `/var/www/workspace/PageLM/backend/`

## Test Structure

### Backend Tests (`backend/tests/`)
- **Unit**: `backend/tests/unit/` - Service functions, utilities, middleware
- **Integration**: `backend/tests/integration/` - API endpoint tests
- **Mocks**: `backend/tests/mocks/` - Mock implementations for LLM, database, file system
- **Setup**: `backend/tests/helpers/setup.ts` - Test utilities and fixtures

### Frontend Tests (`frontend/tests/`)
- **Unit**: `frontend/tests/unit/` - Components (React Testing Library), hooks, utilities
- **Integration**: `frontend/tests/integration/` - API client tests
- **Mocks**: `frontend/tests/mocks/` - API, i18n, router mocks

### E2E Tests (`tests/e2e/`)
- Playwright tests for critical user journeys
- Tests run against all major browsers (Chromium, Firefox, WebKit)
- Mobile viewport tests included

## Coverage Requirements

All modules must maintain 80%+ coverage:
- Branches: 80%
- Functions: 80%
- Lines: 80%
- Statements: 80%

Coverage reports are generated in `backend/coverage/` and `frontend/coverage/`.

## Key File Locations

### Backend
- Main entry: `backend/src/core/index.ts`
- Routes registration: `backend/src/core/router.ts`
- Environment config: `backend/src/config/env.ts`
- Chat service: `backend/src/services/chat/` or `backend/src/utils/chat/`
- SM-2 algorithm: `backend/src/services/spaced-repetition.ts`
- LLM models: `backend/src/utils/llm/models/`
- Database: `backend/src/utils/database/`

### Frontend
- Main entry: `frontend/src/main.tsx`
- App component: `frontend/src/App.tsx`
- Component exports: `frontend/src/components/index.ts`
- API client: `frontend/src/lib/apiClient.ts`
- Query client: `frontend/src/lib/query.ts`
- i18n config: `frontend/src/i18n/i18n.ts`

## CI/CD

GitHub Actions workflow (`.github/workflows/test.yml`) runs:
1. Backend tests with coverage
2. Frontend tests with coverage
3. E2E tests with Playwright

Coverage artifacts are uploaded to Codecov.

## Important Notes

- The backend uses `tsx` for TypeScript execution in development
- Frontend env vars must be prefixed with `VITE_` to be exposed to the client
- File uploads are stored in `storage/uploads/`
- WebSocket connections are used for streaming LLM responses
- The project uses Node.js >=21.18.0
- When running tests, the `json` database mode is used by default
