You are an experienced, pragmatic software engineering AI agent. Do not over-engineer a solution when a simple one is possible. Keep edits minimal. If you want an exception to ANY rule, you MUST stop and get permission first.

# Fitness Tracker

Personal fitness tracking application with a Next.js web dashboard and React Native (Expo) mobile app. Tracks workout sessions, goals, and progress visualization.

## Technology Stack

- **Web**: Next.js 14 (App Router), React 18, TypeScript
- **Mobile**: React Native with Expo 54
- **Database**: PostgreSQL via Prisma ORM (Vercel Postgres)
- **Styling**: Tailwind CSS (web), custom styles (mobile)
- **Forms**: react-hook-form with Zod validation
- **Charts**: Recharts

## Project Structure

```
src/
├── app/           # Next.js App Router pages and API routes
│   └── api/       # REST endpoints: /goals, /workouts, /migrate
├── components/    # React components (dialogs, charts, forms)
├── lib/           # Utilities (utils.ts)
├── types/         # TypeScript type definitions
└── data/          # Data layer
mobile/            # Expo React Native app (separate package.json)
├── src/           # Mobile app source
└── shared -> ../shared  # Symlink to shared code
shared/            # Code shared between web and mobile
prisma/            # Database schema and migrations
scripts/           # Data import utilities
```

## Key Files

- `prisma/schema.prisma` - Database models: `WorkoutSession`, `Goal`
- `src/app/api/*/route.ts` - API endpoints
- `src/components/WorkoutDashboard.tsx` - Main dashboard
- `mobile/App.tsx` - Mobile app entry point

## Essential Commands

```bash
# Web (root directory)
npm run dev          # Start dev server at localhost:3000
npm run build        # Production build
npm run lint         # ESLint check
npm run start        # Start production server

# Database
npx prisma generate  # Generate Prisma client (runs on postinstall)
npx prisma migrate dev --name <name>  # Create migration
npx prisma db push   # Push schema changes without migration

# Mobile (cd mobile/)
npm run start        # Start Expo dev server
npm run ios          # Run on iOS simulator
npm run android      # Run on Android emulator
```

## Patterns

### Path Aliases
Use `@/*` for imports from `src/`:
```typescript
import { cn } from "@/lib/utils";
import { WorkoutSession } from "@/types/workout";
```

### API Routes
API routes use Next.js App Router conventions in `src/app/api/`:
```typescript
// src/app/api/workouts/route.ts
export async function GET() { ... }
export async function POST(request: Request) { ... }
```

### Database Access
Use Prisma client from `@/lib/db` or instantiate directly:
```typescript
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
```

## Commit Guidelines

- Run `npm run lint` and `npm run build` before committing
- Commit format: `type: message` (e.g., `feat: Add workout editing`)
- Common types: `feat`, `fix`, `style`, `refactor`, `docs`
