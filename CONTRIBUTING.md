# Contributing to raaह

Thank you for contributing. This is a public-interest platform — keep that in mind when making decisions about scope, complexity, and user experience.

---

## Ground rules

- No overengineering. Every abstraction must earn its place.
- No test suite (this is a hackathon-stage project). Write code that is obviously correct.
- No emojis anywhere in the UI, placeholder text, headings, or buttons.
- No documentation-for-documentation's-sake. Comments in code only when the *why* is non-obvious.
- No visual gimmicks: no neon, glassmorphism, excessive gradients, or animations.
- Security constraints are non-negotiable — see the Security section below.

---

## Development setup

See the [README](README.md) for full setup instructions. Short version:

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local
# fill in .env.local
pnpm --filter web dev
```

---

## Branch conventions

| Prefix | Use for |
|---|---|
| `feat/` | New features or pages |
| `fix/` | Bug fixes |
| `chore/` | Dependency bumps, config, tooling |
| `module/` | A teammate's assigned stub module |

Branch from `main`. Keep branches short-lived.

---

## Module ownership

The codebase has stub routes for modules not yet built. Before touching a stub, confirm with the team that the module is yours to implement. Stubs live in:

- `apps/web/src/app/(site)/challenges/`
- `apps/web/src/app/(site)/projects/`
- `apps/web/src/app/(site)/industry/`
- `apps/web/src/app/(site)/government/`
- `apps/web/src/lib/matching.ts` (ML recommendations)

The shared stub component is `apps/web/src/app/(site)/_stub.tsx` — remove it from a route once you build real content for that route.

---

## Code conventions

**Server vs client**

- Prefer React Server Components. Only add `"use client"` when you need browser APIs, event handlers, or Supabase auth subscriptions.
- Never import `createSupabaseServiceRoleClient` from a client component. Service role operations belong in Server Actions or Route Handlers only.

**Database access**

- Use `createSupabaseServerClient()` for normal authenticated reads/writes.
- Use `createSupabaseServiceRoleClient()` only for privileged operations (document signing, faculty verification, admin actions).
- Never bypass RLS. Do not use the service role client to work around a policy — fix the policy instead.

**Forms and mutations**

- Use Next.js Server Actions for mutations. Keep action files co-located with the route (`actions.ts` next to `page.tsx`).
- Validate all inputs with Zod on the server. Never trust client-provided role values.

**Styling**

- Use CSS custom properties from `globals.css` for all colours. Do not hardcode hex values in component files.
- Tailwind utility classes are fine. Avoid `style={{}}` props.
- Design tokens are also exported from `lib/design-tokens.ts` — use these if building a mobile companion.

**No new dependencies without discussion**

The dependency list is intentionally small. Before adding a package, check whether the standard library or an existing dependency already covers the need. No microservices, GraphQL layers, ORMs, caching layers, or message queues.

---

## Database changes

- All schema changes go into a new numbered migration file: `supabase/migrations/000N_description.sql`.
- Do not modify `0001_raah_init.sql` directly after it has been applied.
- Every new table needs RLS enabled and policies defined.
- If you add a new privileged operation, gate it with `is_platform_admin()` or `is_institution_admin(institution_id)` as appropriate.

---

## Security

These rules are absolute:

- `SUPABASE_SERVICE_ROLE_KEY` is server-only. It must never appear in client bundles, `NEXT_PUBLIC_*` variables, or client component imports.
- Verification documents live in the `verification-documents` private bucket. Signed URLs must be generated server-side and should be short-lived.
- The `platform_admins` table is the sole source of admin privilege. The `profiles.role` column is informational — any code that grants access based on `profiles.role` alone is a bug.
- Validate redirect targets. Any `next` or `redirect` parameter must be checked to start with `/` before use.

---

## Pull requests

- One logical change per PR.
- Title: imperative present tense. `Add faculty export` not `Added faculty export`.
- Description: what changed and why. Link to any relevant issue or design decision.
- The build must pass: `pnpm --filter web build`.

---

## License

By contributing you agree that your contributions will be licensed under the [MIT License](LICENSE).
