You are an experienced, pragmatic software engineering AI agent. Do not over-engineer a solution when a simple one is possible. Keep edits minimal. If you want an exception to ANY rule, you MUST stop and get permission first.

# Fitness Tracker

Personal fitness tracking application with a Next.js web dashboard. Tracks workout sessions, goals, and progress visualization.

## Technology Stack

- **Web**: Next.js 14 (App Router), React 18, TypeScript
- **Database**: PostgreSQL via Prisma ORM (Vercel Postgres)
- **Authentication**: NextAuth.js v5 (Auth.js) with Google OAuth
- **Styling**: Tailwind CSS
- **Forms**: react-hook-form with Zod validation
- **Charts**: Recharts
- **External APIs**: Strava integration for activity sync

## Project Structure

```
src/
├── app/           # Next.js App Router pages and API routes
│   └── api/       # REST endpoints: /goals, /workouts, /strava/*
├── components/    # React components (dialogs, charts, forms)
├── lib/           # Utilities and shared code (utils, strava, stravaMapping, types)
├── types/         # TypeScript type definitions
├── utils/         # Helper functions (calculations, formatting)
└── data/          # Data layer (currently empty - data in database)
prisma/            # Database schema and migrations
scripts/           # Data import utilities
archive/           # Archived code (mobile app)
```

## Key Files

- `prisma/schema.prisma` - Database models: `WorkoutSession`, `Goal`, `StravaCredential`
- `src/app/api/*/route.ts` - API endpoints
- `src/components/WorkoutDashboard.tsx` - Main dashboard
- `src/lib/strava.ts` - Strava API integration
- `src/lib/stravaMapping.ts` - Activity type mapping logic

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

# Strava Integration
# Set environment variables: STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_WEBHOOK_VERIFY_TOKEN
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

## Authentication

### Overview
The app uses NextAuth.js v5 (Auth.js) with Google OAuth for authentication. All routes are protected by default except `/api/auth/*` and `/login`.

### Setup Instructions

#### 1. Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google+ API** (or **Google Identity**)
4. Go to **APIs & Services** → **Credentials**
5. Click **Create Credentials** → **OAuth 2.0 Client ID**
6. Configure the consent screen:
   - User Type: External (for personal use)
   - Add your email as a test user
   - Scopes: `email`, `profile`, `openid` (default)
7. Application type: **Web application**
8. Add authorized redirect URIs:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://yourdomain.com/api/auth/callback/google`
9. Copy the **Client ID** and **Client Secret**

#### 2. Configure Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in the required values:
   ```bash
   # Generate a secret key (required for production)
   openssl rand -base64 32
   ```

3. Required variables:
   ```env
   NEXTAUTH_SECRET="your-generated-secret"
   NEXTAUTH_URL="http://localhost:3000"  # or your production URL
   GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="your-client-secret"
   ```

4. Optional - Restrict to single user:
   ```env
   ALLOWED_EMAIL="your-email@example.com"
   ```
   If set, only this email can sign in. Leave empty to allow any Google account.

#### 3. Test Authentication

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000`
3. You should be redirected to `/login`
4. Click "Sign in with Google"
5. Complete the OAuth flow
6. You should be redirected back to the dashboard

### Authentication Flow

1. **Middleware** (`middleware.ts`) checks authentication status on every request
2. Unauthenticated users are redirected to `/login`
3. `/login` page provides Google sign-in button
4. OAuth handled by NextAuth.js at `/api/auth/[...nextauth]`
5. Session stored as JWT (serverless-friendly)
6. User info displayed in header with sign-out button

### Key Files

- `auth.ts` - NextAuth.js configuration
- `middleware.ts` - Route protection
- `src/app/api/auth/[...nextauth]/route.ts` - Auth API handlers
- `src/app/login/page.tsx` - Custom sign-in page
- `src/components/AuthHeader.tsx` - User info and sign-out UI
- `.env.example` - Environment variable template

### Security Notes

- All routes except `/api/auth/*` and `/login` require authentication
- Static files (images, fonts, etc.) are excluded from authentication checks
- Sessions use JWT strategy for serverless deployment compatibility
- Optional email restriction for single-user applications
- NEXTAUTH_SECRET must be set in production
