import { Container } from "@/components/ui";

export const metadata = { title: "How it works — Raah" };

const STEPS = [
  {
    n: "01",
    t: "Identify",
    d: "Citizens, communities, panchayats and public bodies submit real problems. Each challenge is validated before it moves forward.",
  },
  {
    n: "02",
    t: "Connect",
    d: "Raah connects validated challenges to institutions whose expertise, faculty and facilities match the problem.",
  },
  {
    n: "03",
    t: "Build",
    d: "Faculty, students and industry mentors collaborate on prototypes and pilots against the challenge.",
  },
  {
    n: "04",
    t: "Impact",
    d: "Solutions move from prototype to pilot to deployment, tracked openly by all stakeholders.",
  },
];

export default function HowItWorksPage() {
  return (
    <Container className="py-14 max-w-3xl">
      <p className="eyebrow mb-3">How it works</p>
      <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
        A shared pathway from problem to deployment.
      </h1>
      <p className="mt-4 text-muted leading-relaxed">
        Raah is designed as a single pathway with four stages. Every
        participant — citizen, institution, industry, government — plays a
        clear role.
      </p>
      <div className="mt-12 divide-y divide-border border-y border-border">
        {STEPS.map((s) => (
          <div key={s.n} className="py-8 grid grid-cols-6 gap-6">
            <p className="eyebrow col-span-1">{s.n}</p>
            <div className="col-span-5">
              <h2 className="text-xl font-semibold">{s.t}</h2>
              <p className="mt-2 text-muted leading-relaxed">{s.d}</p>
            </div>
          </div>
        ))}
      </div>
    </Container>
  );
}
