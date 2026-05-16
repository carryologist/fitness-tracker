# Fitness Tracker

Personal fitness tracking application with workout logging, goal setting, progress visualization, and Peloton + Tonal integration.

## Features

- 📊 **Workout Tracking** - Log workouts with minutes, miles, and weight lifted
- 🎯 **Goal Setting** - Set and track annual fitness goals
- 📈 **Progress Charts** - Visualize your progress over time
- 🚴 **Peloton Integration** - Automatically sync indoor and outdoor rides from Peloton
- 🏋️ **Tonal Integration** - Automatically sync weight lifting sessions with volume data from Tonal
- 🎨 **Dark Mode** - Beautiful dark/light theme support
- 🔒 **Secure Authentication** - Google OAuth login
- 🤖 **MCP Server** - Talk to your fitness data from Claude Desktop, Codex, OpenClaw, and any other MCP-aware AI agent

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL (Vercel Postgres)
- **Authentication**: NextAuth.js v5 with Google OAuth
- **Charts**: Recharts
- **Forms**: react-hook-form with Zod validation

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (or Vercel Postgres)
- Google OAuth credentials

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd fitness-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```

   Fill in the required values in `.env.local`:
   ```env
   # Database
   POSTGRES_PRISMA_URL="postgresql://..."
   POSTGRES_URL_NON_POOLING="postgresql://..."
   
   # NextAuth.js
   NEXTAUTH_SECRET="<generate with: openssl rand -base64 32>"
   NEXTAUTH_URL="http://localhost:3000"
   
   # Google OAuth (see setup instructions below)
   GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="your-client-secret"
   
   # Optional: Restrict to single user
   ALLOWED_EMAIL="your-email@example.com"

   # Personal access token for the MCP server and Bearer-token API access.
   # Generate with: openssl rand -hex 32  (must be >= 16 chars)
   MCP_API_TOKEN="<32+ random hex chars>"
   ```

4. **Set up Google OAuth** (see detailed instructions below)

5. **Set up the database**
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

6. **Run the development server**
   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000)

## Authentication Setup

### Getting Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Google+ API** (or Google Identity)
4. Navigate to **APIs & Services** → **Credentials**
5. Click **Create Credentials** → **OAuth 2.0 Client ID**
6. Configure consent screen:
   - User Type: External
   - Add your email as test user
   - Scopes: `email`, `profile`, `openid`
7. Create OAuth Client ID:
   - Application type: **Web application**
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (development)
     - `https://yourdomain.com/api/auth/callback/google` (production)
8. Copy **Client ID** and **Client Secret** to `.env.local`

### Generate NextAuth Secret

```bash
openssl rand -base64 32
```

Add the output to `NEXTAUTH_SECRET` in `.env.local`

### Single-User Mode (Optional)

To restrict access to only your Google account, set:
```env
ALLOWED_EMAIL="your-email@example.com"
```

## Agent Access (MCP Server)

The app exposes a [Model Context Protocol](https://modelcontextprotocol.io) server at `/api/mcp/mcp` so AI agents (Claude Desktop, Codex, OpenClaw, Cursor, etc.) can read your workout data, log new workouts, and trigger Peloton / Tonal syncs.

### Setup

1. Generate a token and add it to your env:
   ```bash
   openssl rand -hex 32
   ```
   ```env
   MCP_API_TOKEN="<paste the hex string here>"
   ```
   Set the same value in Vercel project settings for production. The token must be at least 16 characters.

2. Point an MCP client at the endpoint. Example client config (Claude Desktop `claude_desktop_config.json`, Codex `~/.codex/config.toml`, OpenClaw, etc.):
   ```json
   {
     "mcpServers": {
       "fitness-tracker": {
         "type": "http",
         "url": "https://<your-app>.vercel.app/api/mcp/mcp",
         "headers": { "Authorization": "Bearer <MCP_API_TOKEN>" }
       }
     }
   }
   ```

### Tools exposed

All tools return raw rows (no precomputed aggregates) so the agent can do its own analysis.

- `list_workouts` — filter by year / source / activity / since / limit
- `get_workout` — fetch one row by ID
- `create_workout`, `update_workout`, `delete_workout` — full CRUD on manual entries
- `list_goals` — annual targets + derived weekly / quarterly values
- `peloton_status`, `sync_peloton` — check connection, pull new workouts
- `tonal_status`, `sync_tonal` — same for Tonal

### REST API with the same token

`MCP_API_TOKEN` also works as a personal access token for the existing REST routes. Send `Authorization: Bearer $MCP_API_TOKEN` instead of a session cookie:

```bash
curl -H "Authorization: Bearer $MCP_API_TOKEN" \
     https://<your-app>.vercel.app/api/workouts?year=2025
```

## Peloton & Tonal Integration (Optional)

Both integrations use email/password authentication (no OAuth redirect flow).

Add to `.env.local`:
```env
# Peloton (session-cookie auth)
PELOTON_EMAIL="your-peloton-email"
PELOTON_PASSWORD="your-peloton-password"

# Tonal (Auth0 password grant)
TONAL_EMAIL="your-tonal-email"
TONAL_PASSWORD="your-tonal-password"
```

Connect each service from the dashboard.

## Development

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint

npx prisma studio    # Open Prisma Studio (database GUI)
npx prisma migrate dev --name <name>  # Create migration
```

## Database Schema

- **WorkoutSession** - Individual workout records
- **Goal** - Annual fitness goals
- **PelotonCredential** - Session credentials for Peloton integration
- **TonalCredential** - Auth credentials for Tonal integration

## Project Structure

```
src/
├── app/
│   ├── api/              # API routes
│   │   ├── auth/         # NextAuth.js handlers
│   │   ├── workouts/     # Workout CRUD
│   │   ├── goals/        # Goal CRUD
│   │   ├── peloton/      # Peloton integration
│   │   ├── tonal/        # Tonal integration
│   │   └── mcp/          # MCP server for AI agents
│   ├── login/            # Sign-in page
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Dashboard page
├── components/           # React components
├── lib/                  # Utilities and helpers
├── types/                # TypeScript types
└── utils/                # Helper functions
prisma/
└── schema.prisma         # Database schema
auth.ts                   # NextAuth.js configuration
middleware.ts             # Route protection
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

Make sure to:
- Update `NEXTAUTH_URL` to your production URL
- Add production callback URL to Google OAuth settings
- Set `NEXTAUTH_SECRET` (different from local)

## Security

### Auth model

- Two equivalent paths to authenticate any `/api/*` request:
  - A NextAuth Google session cookie (set by `/login`), OR
  - `Authorization: Bearer $MCP_API_TOKEN` (for MCP clients and scripts)
- Middleware is the first gate; route handlers re-verify with
  `requireAuth(request)` and return 401 when both paths fail
  (defence-in-depth — F-01 in the security report).
- `/login` and `/api/auth/*` are the only un-authed paths.

### `MCP_API_TOKEN` is a global admin credential

This app is single-tenant by design — `ALLOWED_EMAIL` gates the one
human user, and the data model has no per-user partitioning. That means
`MCP_API_TOKEN` unlocks **everything**: read, write, delete, sync,
disconnect credentials. Treat it like the database password:

- Generate with `openssl rand -hex 32` (≥16 chars enforced; 32+ recommended).
- Store only in Vercel project env vars; never commit, never share in DMs.
- Rotate by:
  1. Generate a new value, set `MCP_API_TOKEN` on Vercel (preview + prod).
  2. Update Claude Desktop / Codex / Cursor configs with the new value.
  3. Redeploy. Old token stops working on the next cold start.
- An audit row is written for every bearer-authed mutation; review
  the `audit_log` table after suspected exposure.

### At-rest protections

- Sessions use JWT for serverless compatibility; session cookies are
  `HttpOnly`, `SameSite=Lax`, `Secure` in production, with the
  `__Secure-` prefix in production.
- Optional single-user restriction via `ALLOWED_EMAIL`. When unset,
  all sign-ins are denied (fail-closed).
- Peloton and Tonal credentials (session IDs, OAuth tokens) are
  encrypted column-side with AES-256-GCM via `CREDENTIAL_ENC_KEY`
  (set to 64 hex chars — `openssl rand -hex 32`). Legacy plaintext
  rows remain readable; they re-encrypt on the next token refresh.
- Soft-delete on `workout_sessions`: API DELETE / MCP `delete_workout`
  set `deletedAt` rather than removing the row. List/get filter out
  soft-deleted rows.

### Transport + browser hardening

- HSTS (`max-age=63072000; includeSubDomains; preload`) in production.
- Baseline Content-Security-Policy in `next.config.ts`.
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`,
  `Permissions-Policy` disabling camera/mic/geo.
- CORS on `/api/mcp` is allow-listed to `APP_BASE_URL`, `VERCEL_URL`,
  and (in dev only) `localhost`. Any other origin gets no
  `Access-Control-*` headers, so browser cross-origin calls fail.

### Rate limiting + audit

- In-memory token-bucket rate limit on `/api/mcp` (120/min general,
  ~10/min for sync-shaped calls). Process-local — upgrade to Vercel
  KV / Upstash for distributed limits if traffic grows.
- `audit_log` table records every bearer-authed mutation, sync run,
  and credential disconnect with actor, action, IP, and JSON details.

### Reporting

If you find a security issue, open a private advisory on GitHub
rather than a public issue.

## License

MIT

## Contributing

This is a personal project, but feel free to fork and adapt for your own use!
