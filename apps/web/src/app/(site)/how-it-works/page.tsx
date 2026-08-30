import Link from "next/link";
import {
  Badge,
  Card,
  Chip,
  Container,
  LinkButton,
  SectionTitle,
} from "@/components/ui";
import {
  ArrowRightIcon,
  BuildingIcon,
  CheckIcon,
  CoinIcon,
  FlagIcon,
  FolderIcon,
  GraduationIcon,
  HandshakeIcon,
  MapPinIcon,
  SparkleIcon,
  UserIcon,
} from "@/components/icons";
import { RaahMark } from "@/components/mark";

export const metadata = { title: "How it works — Raah" };

const STEPS = [
  {
    n: "01",
    icon: <FlagIcon size={18} />,
    tone: "accent" as const,
    t: "Identify",
    d: "Citizens, communities, panchayats and public bodies submit real challenges. Each is validated before it moves forward.",
    who: ["Citizens", "Panchayats", "Public bodies"],
  },
  {
    n: "02",
    icon: <SparkleIcon size={18} />,
    tone: "info" as const,
    t: "Match",
    d: "Raah matches validated challenges to institutions whose research, faculty and facilities fit the problem — structured data, not guesswork.",
    who: ["Institutions", "Faculty", "Government"],
  },
  {
    n: "03",
    icon: <HandshakeIcon size={18} />,
    tone: "warning" as const,
    t: "Build",
    d: "Faculty, student teams and industry mentors collaborate on prototypes and pilots. Progress is tracked stage by stage.",
    who: ["Students", "Industry", "CSR"],
  },
  {
    n: "04",
    icon: <CheckIcon size={18} />,
    tone: "success" as const,
    t: "Deploy",
    d: "Solutions move from prototype to pilot to deployment, tracked openly by all stakeholders — with the outcome visible.",
    who: ["Government", "Institutions", "Industry"],
  },
];

const WHY = [
  {
    icon: <FlagIcon size={18} />,
    title: "Real problems, not hackathon prompts",
    body: "Challenges come from the people living them — verified before they reach an institution. No fabricated scenarios.",
  },
  {
    icon: <SparkleIcon size={18} />,
    title: "Structured matching, transparent scoring",
    body: "Institutions are scored on verifiable signals: verified faculty, research areas, facilities. No opaque ranking games.",
  },
  {
    icon: <HandshakeIcon size={18} />,
    title: "One pathway, four stakeholders",
    body: "Citizen, institution, industry, government all move through the same lifecycle. No parallel silos to reconcile later.",
  },
  {
    icon: <BuildingIcon size={18} />,
    title: "Built on institutions that already exist",
    body: "Raah works with your college, your faculty, your labs. We don't ask you to leave the ecosystem you're already in.",
  },
  {
    icon: <CoinIcon size={18} />,
    title: "Support offers, not marketing pitches",
    body: "Industry expresses concrete support: technical, mentorship, funding. Every offer is auditable, none of it is a transaction.",
  },
  {
    icon: <MapPinIcon size={18} />,
    title: "Deployment is a stage, not a hope",
    body: "Projects don't end at prototype. Raah tracks pilot and deployment as first-class stages, so the last mile actually happens.",
  },
];

const ROLES = [
  {
    icon: <UserIcon size={18} />,
    label: "Citizen",
    action: "Report a challenge that affects your community.",
    href: "/challenges",
    hrefLabel: "See open challenges",
  },
  {
    icon: <BuildingIcon size={18} />,
    label: "Institution",
    action: "Register your college or research institution and adopt challenges.",
    href: "/onboarding/institution",
    hrefLabel: "Register institution",
  },
  {
    icon: <HandshakeIcon size={18} />,
    label: "Industry / Startup",
    action: "Discover projects that need your tech, mentorship or funding.",
    href: "/industry/onboarding",
    hrefLabel: "Register organization",
  },
  {
    icon: <FlagIcon size={18} />,
    label: "Government",
    action: "Triage citizen-reported issues on the live map and act on them.",
    href: "/government",
    hrefLabel: "Open dashboard",
  },
];

const COMPARE = [
  {
    them: "One-off hackathons",
    us: "A continuous pathway from problem to deployment",
  },
  {
    them: "Isolated NGO / CSR programs",
    us: "Shared visibility across citizen, institution, industry, government",
  },
  {
    them: "Opaque grant reviews",
    us: "Structured, transparent institutional capability scoring",
  },
  {
    them: "PDF proposals nobody reads",
    us: "Live project pages with milestones, media, and offers",
  },
];

export default function HowItWorksPage() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-[color:var(--border)]">
        <div
          aria-hidden
          className="absolute inset-0 bg-dots opacity-60 pointer-events-none"
        />
        <div
          aria-hidden
          className="absolute -top-24 -right-24 h-96 w-96 rounded-full blur-3xl opacity-30 bg-[color:var(--accent)] pointer-events-none"
        />
        <div
          aria-hidden
          className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full blur-3xl opacity-25 bg-[color:var(--accent-2)] pointer-events-none"
        />
        <Container className="relative py-16 md:py-24 max-w-4xl">
          <div className="flex items-center gap-2 mb-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)]">
              <RaahMark size={18} />
            </div>
            <Badge tone="accent">How it works</Badge>
          </div>
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
            One pathway.
            <br />
            <span className="text-[color:var(--accent)]">
              Real problems.
            </span>{" "}
            <span className="text-muted">Real deployment.</span>
          </h1>
          <p className="mt-6 text-base md:text-lg text-muted leading-relaxed max-w-2xl">
            Raah is a shared route from a citizen&apos;s reported challenge to a
            deployed solution — validated, matched, built, and shipped by the
            people who can actually do it.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton href="/challenges" variant="dark">
              Explore challenges
              <ArrowRightIcon size={14} />
            </LinkButton>
            <LinkButton href="/auth/register" variant="secondary">
              Get started
            </LinkButton>
          </div>
        </Container>
      </section>

      {/* ── The pathway (4 steps) ────────────────────────────── */}
      <section className="border-b border-[color:var(--border)]">
        <Container className="py-16 md:py-20">
          <SectionTitle
            eyebrow="The pathway"
            title="Four stages. One shared timeline."
            description="Everyone — citizen, institution, industry, government — moves through the same lifecycle. No parallel silos."
          />

          {/* Connector line + step cards */}
          <div className="relative mt-12">
            <div
              aria-hidden
              className="hidden lg:block absolute left-0 right-0 top-9 h-px bg-gradient-to-r from-transparent via-[color:var(--border-strong)] to-transparent"
            />
            <ol className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5 relative">
              {STEPS.map((s) => (
                <li key={s.n} className="relative">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="relative z-10 flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-[color:var(--surface)] border border-[color:var(--border)] shadow-[var(--shadow-sm)]">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl text-[color:var(--foreground)]`}
                        style={{
                          background:
                            s.tone === "accent"
                              ? "var(--accent-soft)"
                              : s.tone === "info"
                                ? "var(--info-soft)"
                                : s.tone === "warning"
                                  ? "var(--warning-soft)"
                                  : "var(--success-soft)",
                          color:
                            s.tone === "accent"
                              ? "var(--accent)"
                              : s.tone === "info"
                                ? "var(--info)"
                                : s.tone === "warning"
                                  ? "var(--warning)"
                                  : "var(--success)",
                        }}
                      >
                        {s.icon}
                      </div>
                    </div>
                    <span className="text-4xl font-semibold tabular-nums text-muted-2 tracking-tight">
                      {s.n}
                    </span>
                  </div>

                  <Card className="p-5 h-full">
                    <h3 className="text-lg font-semibold tracking-tight">
                      {s.t}
                    </h3>
                    <p className="mt-2 text-sm text-muted leading-relaxed">
                      {s.d}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {s.who.map((w) => (
                        <Chip key={w}>{w}</Chip>
                      ))}
                    </div>
                  </Card>
                </li>
              ))}
            </ol>
          </div>
        </Container>
      </section>

      {/* ── Why choose Raah ──────────────────────────────────── */}
      <section className="border-b border-[color:var(--border)]">
        <Container className="py-16 md:py-20">
          <SectionTitle
            eyebrow="Why Raah"
            title="Six things you won't get elsewhere."
            description="Most platforms stop at a submission form. Raah keeps going until the solution is deployed."
          />
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {WHY.map((w) => (
              <Card key={w.title} interactive className="p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--accent-soft)] text-[color:var(--accent)] mb-4">
                  {w.icon}
                </div>
                <h3 className="text-base font-semibold tracking-tight">
                  {w.title}
                </h3>
                <p className="mt-2 text-sm text-muted leading-relaxed">
                  {w.body}
                </p>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      {/* ── vs. traditional approaches ───────────────────────── */}
      <section className="border-b border-[color:var(--border)]">
        <Container className="py-16 md:py-20">
          <SectionTitle
            eyebrow="Compared to"
            title="A different shape."
            description="Where the usual approach stops, Raah keeps a shared timeline."
          />
          <Card className="mt-10 p-0 overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[color:var(--border)]">
              <div className="p-6 md:p-8 bg-[color:var(--surface-2)]">
                <p className="eyebrow mb-4 text-muted">The usual approach</p>
                <ul className="space-y-3">
                  {COMPARE.map((c) => (
                    <li
                      key={c.them}
                      className="flex items-start gap-3 text-sm text-muted line-through decoration-[color:var(--muted-2)] decoration-1"
                    >
                      <span
                        aria-hidden
                        className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[color:var(--muted-2)] shrink-0"
                      />
                      {c.them}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-6 md:p-8">
                <p className="eyebrow mb-4 text-[color:var(--accent)]">
                  Raah
                </p>
                <ul className="space-y-3">
                  {COMPARE.map((c) => (
                    <li
                      key={c.us}
                      className="flex items-start gap-3 text-sm text-foreground"
                    >
                      <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--accent-2-soft)] text-[color:var(--accent-2)] shrink-0">
                        <CheckIcon size={12} />
                      </span>
                      {c.us}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        </Container>
      </section>

      {/* ── Roles / find your entry ──────────────────────────── */}
      <section className="border-b border-[color:var(--border)]">
        <Container className="py-16 md:py-20">
          <SectionTitle
            eyebrow="Find your role"
            title="Where do you enter the pathway?"
            description="Four doors. Pick the one that fits, sign in, and Raah takes you to the right dashboard."
          />
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {ROLES.map((r) => (
              <Card
                key={r.label}
                interactive
                tone={r.label === "Citizen" ? "warm" : "default"}
                className="p-6 flex flex-col"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--surface-inset)] text-[color:var(--foreground)] mb-4">
                  {r.icon}
                </div>
                <p className="text-xs uppercase tracking-widest text-muted-2 mb-1">
                  {r.label}
                </p>
                <p className="text-sm leading-relaxed text-foreground">
                  {r.action}
                </p>
                <div className="mt-auto pt-5">
                  <Link
                    href={r.href}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground hover:text-[color:var(--accent)] transition-colors"
                  >
                    {r.hrefLabel}
                    <ArrowRightIcon size={12} />
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      {/* ── Trust & lifecycle strip ─────────────────────────── */}
      <section className="border-b border-[color:var(--border)]">
        <Container className="py-16 md:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card tone="sage" className="p-6 lg:col-span-2">
              <p className="eyebrow mb-4">Anatomy of a project on Raah</p>
              <ul className="space-y-3">
                {[
                  {
                    icon: <FolderIcon size={14} />,
                    label: "Challenge",
                    body: "Reported by a citizen or public body, category-tagged, geolocated.",
                  },
                  {
                    icon: <BuildingIcon size={14} />,
                    label: "Institution",
                    body: "Adopted by a verified institution with matching research areas.",
                  },
                  {
                    icon: <GraduationIcon size={14} />,
                    label: "Mentor",
                    body: "A faculty mentor is attached with department and expertise.",
                  },
                  {
                    icon: <HandshakeIcon size={14} />,
                    label: "Support",
                    body: "Industry offers technical support, mentorship or funding as expressions of interest.",
                  },
                  {
                    icon: <CheckIcon size={14} />,
                    label: "Milestones",
                    body: "Research → prototype → pilot → deployment, each with dated evidence.",
                  },
                ].map((row) => (
                  <li key={row.label} className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--surface)] border border-[color:var(--border)] text-[color:var(--accent-2)] shrink-0">
                      {row.icon}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {row.label}
                      </p>
                      <p className="text-sm text-muted leading-relaxed">
                        {row.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-6 flex flex-col">
              <p className="eyebrow mb-4">Trust signals</p>
              <ul className="space-y-4">
                <li>
                  <p className="text-2xl font-semibold tracking-tight tabular-nums">
                    Verified
                  </p>
                  <p className="text-sm text-muted">
                    Institutions submit verifiable identity documents before
                    they appear in matching.
                  </p>
                </li>
                <li>
                  <p className="text-2xl font-semibold tracking-tight tabular-nums">
                    Transparent
                  </p>
                  <p className="text-sm text-muted">
                    Capability scores are derived from measurable, public
                    signals — never opaque.
                  </p>
                </li>
                <li>
                  <p className="text-2xl font-semibold tracking-tight tabular-nums">
                    Open
                  </p>
                  <p className="text-sm text-muted">
                    Project pages are live; anyone can follow milestones from
                    problem to deployment.
                  </p>
                </li>
              </ul>
            </Card>
          </div>
        </Container>
      </section>

      {/* ── Final CTA ────────────────────────────────────────── */}
      <section>
        <Container className="py-16 md:py-24">
          <Card tone="blush" className="p-8 md:p-12 relative overflow-hidden">
            <div
              aria-hidden
              className="absolute -right-16 -bottom-16 h-64 w-64 rounded-full blur-3xl opacity-40 bg-[color:var(--accent)]"
            />
            <div className="relative max-w-2xl">
              <p className="eyebrow mb-3">Get started</p>
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
                Pick your entry.
                <br />
                <span className="text-muted">
                  The rest of the pathway is already built.
                </span>
              </h2>
              <p className="mt-4 text-sm md:text-base text-muted leading-relaxed">
                Whether you&apos;re a citizen with a problem, an institution
                ready to adopt one, or an organization ready to support a
                pilot, Raah drops you into the right place.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <LinkButton href="/auth/register" variant="dark">
                  Create an account
                  <ArrowRightIcon size={14} />
                </LinkButton>
                <LinkButton href="/challenges" variant="secondary">
                  Browse challenges
                </LinkButton>
              </div>
            </div>
          </Card>
        </Container>
      </section>
    </>
  );
}
