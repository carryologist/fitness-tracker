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

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
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
│   │   └── tonal/        # Tonal integration
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

- All routes require authentication (except `/login` and `/api/auth/*`)
- Sessions use JWT for serverless compatibility
- Optional single-user restriction via `ALLOWED_EMAIL`
- Peloton and Tonal credentials encrypted in database

## License

MIT

## Contributing

This is a personal project, but feel free to fork and adapt for your own use!
