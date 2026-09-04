# raaह — Raah

A public-interest platform connecting citizens, academic institutions, industry, and the Government of Jharkhand to identify, fund, and solve societal challenges together.

Raah (रास्ता — meaning "path" or "way") is built as a serious institutional tool: no growth hacks, no engagement loops. It exists to reduce the friction between a problem a district faces, the expertise an institution can offer, and the resources an industry can deploy.

---

## What it does

- **Citizens and government** post validated societal challenges.
- **Academic institutions** register, verify, and expose their capabilities, research areas, faculty, and infrastructure.
- **Industry** discovers institutions and challenges relevant to their CSR or R&D mandate.
- **A transparent capability score** — not a black-box AI rank — surfaces which institutions are best positioned for each challenge.
- **Verification is multi-signal**: official domain confirmation, document upload, and faculty affiliation via tokenised email.

---

## Project structure

```
raah/
├── apps/
│   └── web/                        # Next.js 16 web application
│       ├── src/
│       │   ├── app/
│       │   │   ├── (auth)/         # Auth route group (sign-in, register)
│       │   │   │   └── auth/
│       │   │   │       ├── sign-in/
│       │   │   │       └── register/
│       │   │   ├── (site)/         # Public-facing pages
│       │   │   │   ├── page.tsx            # Homepage
│       │   │   │   ├── institutions/       # Institution directory + public profiles
│       │   │   │   ├── challenges/         # Challenge browser (stub)
│       │   │   │   ├── projects/           # Projects browser (stub)
│       │   │   │   ├── industry/           # Industry portal (stub)
│       │   │   │   ├── government/         # Government portal (stub)
│       │   │   │   ├── how-it-works/
│       │   │   │   └── about/
│       │   │   ├── auth/
│       │   │   │   └── callback/   # OAuth PKCE callback route
│       │   │   ├── institution/    # Authenticated institution dashboard
│       │   │   │   ├── page.tsx            # Dashboard + capability score
│       │   │   │   ├── profile/            # Profile editor
│       │   │   │   ├── verification/       # Verification workflow
│       │   │   │   └── people/             # Faculty management
│       │   │   ├── admin/          # Platform admin review interface
│       │   │   ├── faculty-verify/ # Faculty affiliation token landing
│       │   │   └── onboarding/
│       │   │       └── institution/# Institution registration form
│       │   ├── components/
│       │   │   ├── ui.tsx          # All UI primitives (Button, Card, Input…)
│       │   │   ├── mark.tsx        # RaahMark, ArcArtifact, PathwayArtifact SVGs
│       │   │   ├── site-nav.tsx    # Sticky header + footer
│       │   │   ├── google-button.tsx
│       │   │   └── sign-out-button.tsx
│       │   └── lib/
│       │       ├── supabase/
│       │       │   ├── browser.ts  # Client-side Supabase client
│       │       │   ├── server.ts   # Server + service-role clients
│       │       │   ├── env.ts      # Env var accessors (throws if missing)
│       │       │   └── types.ts    # TypeScript types mirroring DB schema
│       │       ├── auth.ts         # getSession, requireSession, requireAdmin
│       │       ├── capability.ts   # Transparent capability scoring
│       │       ├── design-tokens.ts# Palette constants for mobile app import
│       │       ├── institution.ts  # requireInstitutionMembership
│       │       ├── matching.ts     # ML matching stub
│       │       ├── slug.ts         # slugify, domainFromUrl
│       │       └── validation.ts   # Zod schemas
│       ├── proxy.ts                # Next.js 16 session-refresh proxy
│       ├── next.config.ts
│       ├── postcss.config.mjs
│       └── tsconfig.json
├── Recurring model/                # ML models and data processing pipelines
│   ├── ml_pipeline/                # Teacher-student model training pipeline
│   ├── unify/                      # Data standardization and normalization module
│   ├── audit/                      # Validation and reporting module
│   ├── run_ml_pipeline.py          # ML pipeline execution script
│   ├── run_unify_pipeline.py       # Data unification execution script
│   └── .gitignore
├── services/                       # Microservices and backend services
├── supabase/
│   └── migrations/
│       └── 0001_raah_init.sql      # Full schema, RLS, triggers, storage bucket
├── docs/                           # Documentation
│   └── industry-user-flow.md       # Industry user flow documentation
├── package.json                    # Monorepo root (pnpm workspaces)
├── pnpm-lock.yaml
└── pnpm-workspace.yaml
```

---

## Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 16.3.2 | App Router, React Server Components, Server Actions |
| UI | React 19 + Tailwind CSS v4 | `@import "tailwindcss"`, CSS custom properties for theming |
| Database | Supabase PostgreSQL | RLS enforced at DB level, not just UI |
| Auth | Supabase Auth | Email/password + Google OAuth (PKCE flow) |
| Storage | Supabase Storage | Private bucket for verification documents; signed URLs via service role |
| Validation | Zod v4 | Server-side only |
| Package manager | pnpm 11 | Monorepo via `pnpm-workspace.yaml` |
| Language | TypeScript 5 | Strict mode |
| Compiler | React Compiler (babel-plugin-react-compiler) | Enabled in `next.config.ts` |
| ML Pipeline | Python 3.8+ | Teacher-student model training and data standardization |

---

## Database

The full schema lives in [`supabase/migrations/0001_raah_init.sql`](supabase/migrations/0001_raah_init.sql).

Key tables:

- `profiles` — one row per auth user; `role` column is informational only
- `platform_admins` — separate table; only rows here grant admin privilege (never trust `profiles.role`)
- `institutions` — registered institutions with verification status
- `institution_members` — who administers each institution
- `faculty` + `faculty_verifications` — faculty records and token-based affiliation verification
- `institution_verifications` + `verification_documents` — admin review workflow

Row Level Security is enforced on every table. Helper functions `is_platform_admin()` and `is_institution_admin(institution_id)` are defined as `SECURITY DEFINER` so they cannot be bypassed by clients.

---

## ML Models & Data Processing

### ML Pipeline (`Recurring model/ml_pipeline/`)
Implements teacher-student model training for efficient inference. Used for matching institutions to challenges and projects. Run via `Recurring model/run_ml_pipeline.py`.

### Data Unification (`Recurring model/unify/`)
Standardizes and normalizes data from diverse sources to ensure consistency across the platform. Run via `Recurring model/run_unify_pipeline.py`.

### Audit Module (`Recurring model/audit/`)
Provides validation and reporting utilities for model performance, data quality, and system health.

---

## Environment variables

Copy [`apps/web/.env.example`](apps/web/.env.example) to `apps/web/.env.local` and fill in the values:

```
NEXT_PUBLIC_SUPABASE_URL=        # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Public anon key
SUPABASE_SERVICE_ROLE_KEY=       # Server-only. Never expose to the client.
NEXT_PUBLIC_APP_URL=http://localhost:3000
ML_SERVICE_URL=                  # Future matching service (optional, stub)
```

`SUPABASE_SERVICE_ROLE_KEY` is used exclusively in Server Actions and Route Handlers via `createSupabaseServiceRoleClient()`. It is never imported from any client component.

---

## Getting started

### Prerequisites

- Node.js 20+
- pnpm 11 (`npm i -g pnpm` or it is auto-downloaded via `devEngines`)
- Python 3.8+ (for ML models)
- A Supabase project (free tier is fine for development)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up the database

Apply the migration to your Supabase project. Either:

```bash
supabase db push
```

Or paste the contents of `supabase/migrations/0001_raah_init.sql` into the Supabase SQL editor.

### 3. Configure environment

```bash
cp apps/web/.env.example apps/web/.env.local
# then edit .env.local with real values
```

### 4. Enable Google OAuth (optional)

In Supabase dashboard: **Authentication → Providers → Google**. Enable it and add `<NEXT_PUBLIC_APP_URL>/auth/callback` to the allowed redirect URLs.

### 5. Add the first platform admin

After creating your account, find your user UUID in Supabase Auth and run:

```sql
insert into platform_admins (user_id) values ('<your-uuid>');
```

### 6. Run the development server

```bash
pnpm --filter web dev
```

The app will be at `http://localhost:3000`.

### 7. Run ML pipelines (optional)

For data unification:
```bash
cd "Recurring model"
python run_unify_pipeline.py
```

For ML training:
```bash
cd "Recurring model"
python run_ml_pipeline.py
```

---

## Building for production

```bash
pnpm --filter web build
```

Then:

```bash
pnpm --filter web start
```

The build outputs 22 static/server routes. There are no environment-specific code splits — the same build artifact works in any Node.js host (Vercel, Railway, Fly, etc.).

---

## Design system

Design tokens are defined as CSS custom properties in [`apps/web/src/app/globals.css`](apps/web/src/app/globals.css) and mirrored as plain TypeScript constants in [`apps/web/src/lib/design-tokens.ts`](apps/web/src/lib/design-tokens.ts).

Palette summary (warm ivory + terracotta + sage):

```
--background:   #faf6ee   warm ivory
--accent:       #b46a4a   terracotta (primary actions)
--accent-2:     #6f8a68   sage green (secondary accents)
--foreground:   #241f18   near-black
--muted:        #6c6151   warm grey
```

---

## Module ownership (hackathon team)

| Module | Routes | Status |
|---|---|---|
| Core platform + institutions | `/`, `/institutions`, `/institution/*`, `/admin/*`, `/auth/*` | Complete |
| Challenges | `/challenges/*` | Stub — assign to teammate |
| Projects | `/projects/*` | Stub — assign to teammate |
| Industry portal | `/industry/*` | Stub — assign to teammate |
| Government portal | `/government/*` | Stub — assign to teammate |
| ML matching | `lib/matching.ts` | Stub — `getInstitutionRecommendations()` returns `[]` |
| ML Pipeline | `Recurring model/ml_pipeline/` | In Progress |
| Data Unification | `Recurring model/unify/` | In Progress |
| Audit & Validation | `Recurring model/audit/` | In Progress |

Stubs are rendered via the shared `ModuleStub` component in [`apps/web/src/app/(site)/_stub.tsx`](apps/web/src/app/(site)/_stub.tsx).

---

## Security notes

- RLS policies are the enforcement layer, not UI guards.
- Admin privilege is gated by the `platform_admins` table — no client can promote themselves by writing to `profiles.role`.
- Verification documents are in a **private** Supabase Storage bucket. Signed URLs are generated server-side via the service role client and expire after 60 seconds.
- The `next` redirect parameter in `/auth/callback` is validated to start with `/` to prevent open redirect attacks.

---

## License

MIT. See [LICENSE](LICENSE).
