import Link from "next/link";
import { ArcArtifact, PathwayArtifact } from "@/components/mark";
import { Container, LinkButton, SectionTitle } from "@/components/ui";

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-[color:var(--surface)]">
        <div className="absolute inset-0 pointer-events-none opacity-70 bg-dots" />
        <div className="absolute -right-24 -top-16 w-[520px] h-[520px] text-[color:var(--accent)]/40 pointer-events-none hidden md:block">
          <PathwayArtifact className="w-full h-full" />
        </div>
        <Container className="relative py-24 md:py-36">
          <p className="eyebrow mb-6 flex items-center gap-3">
            <span className="inline-block w-8 h-px bg-[color:var(--accent)]" />
            Government of Jharkhand
          </p>
          <h1 className="text-5xl md:text-7xl font-semibold tracking-tight leading-[1.02] text-foreground max-w-4xl">
            Raah — Finding a Pathway for Societal Challenges
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-muted">
            Communities identify problems. Institutions provide expertise.
            Industry helps build and deploy solutions. Raah is the pathway that
            connects them.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <LinkButton href="/challenges/new">Submit a Challenge</LinkButton>
            <LinkButton href="/institutions" variant="secondary">
              Explore Institutions
            </LinkButton>
          </div>
        </Container>
      </section>

      {/* Ecosystem */}
      <section className="relative bg-background">
        <Container className="py-20 md:py-28">
          <SectionTitle
            eyebrow="How Raah works"
            title="From a real problem to a deployable solution"
          />
          <div className="mt-14 grid grid-cols-1 md:grid-cols-4 gap-x-10 gap-y-12">
            {[
              {
                n: "01",
                t: "Identify",
                d: "Communities, panchayats and public bodies bring real problems to the platform.",
                tone: "accent",
              },
              {
                n: "02",
                t: "Connect",
                d: "Raah connects validated challenges with institutions that have the relevant expertise.",
                tone: "accent2",
              },
              {
                n: "03",
                t: "Build",
                d: "Universities, students, faculty and industry collaborate on prototypes and pilots.",
                tone: "accent",
              },
              {
                n: "04",
                t: "Impact",
                d: "Solutions move from ideas to prototypes, pilots and deployment.",
                tone: "accent2",
              },
            ].map((s) => (
              <div key={s.n}>
                <div
                  className="h-0.5 w-10 mb-6"
                  style={{
                    background:
                      s.tone === "accent"
                        ? "var(--accent)"
                        : "var(--accent-2)",
                  }}
                />
                <p className="eyebrow">{s.n}</p>
                <h3 className="mt-3 text-xl font-semibold text-foreground">
                  {s.t}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {s.d}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Roles */}
      <section className="relative border-t border-border bg-[color:var(--surface-2)] overflow-hidden">
        <div className="absolute -left-24 -bottom-16 w-[420px] h-[420px] text-[color:var(--accent-2)] opacity-60 pointer-events-none hidden md:block">
          <ArcArtifact className="w-full h-full" />
        </div>
        <Container className="relative py-20 md:py-28 grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <p className="eyebrow mb-6">Who Raah is for</p>
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight leading-tight text-foreground">
              A shared pathway for citizens, institutions, industry and
              government.
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-8">
            {[
              {
                t: "Citizens & Communities",
                d: "Surface the problems your community actually needs solved.",
              },
              {
                t: "Institutions",
                d: "Register your expertise and get matched with meaningful work.",
              },
              {
                t: "Government",
                d: "Validate challenges and monitor projects from idea to deployment.",
              },
              {
                t: "Industry & CSR",
                d: "Mentor teams, fund pilots and support solutions to reach the field.",
              },
            ].map((r) => (
              <div
                key={r.t}
                className="border border-border bg-background p-5"
              >
                <div className="h-0.5 w-8 mb-4 bg-[color:var(--accent)]" />
                <h3 className="text-base font-semibold text-foreground">
                  {r.t}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {r.d}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* CTA */}
      <section>
        <Container className="py-20 md:py-28">
          <div className="relative overflow-hidden border border-border bg-[color:var(--surface-3)] p-10 md:p-14 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div className="absolute right-0 top-0 w-40 h-40 text-[color:var(--accent)] opacity-40 pointer-events-none">
              <ArcArtifact className="w-full h-full" />
            </div>
            <div className="relative max-w-xl">
              <p className="eyebrow mb-3">Get involved</p>
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
                Institutions of Jharkhand, join Raah.
              </h2>
              <p className="mt-3 text-muted">
                Register your institution, submit verification, and start being
                matched with challenges from communities across the state.
              </p>
            </div>
            <div className="relative flex flex-wrap gap-3">
              <LinkButton href="/auth/register?role=institution">
                Register your institution
              </LinkButton>
              <Link
                href="/auth/sign-in"
                className="inline-flex items-center h-10 px-1 text-sm underline underline-offset-4 text-foreground"
              >
                Already registered? Sign in
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
