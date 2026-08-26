import { Container } from "@/components/ui";

export const metadata = { title: "About — Raah" };

export default function AboutPage() {
  return (
    <Container className="py-14 max-w-3xl">
      <p className="eyebrow mb-3">About</p>
      <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
        Raah is a public platform for societal problem solving.
      </h1>
      <div className="mt-8 space-y-6 text-base leading-relaxed text-muted">
        <p>
          Raah is an initiative of the Government of Jharkhand that connects
          citizens and communities with higher-education institutions,
          government bodies, industry and research organizations. Its purpose
          is to turn real societal problems into research, innovation,
          prototypes and deployable solutions.
        </p>
        <p>
          Communities identify problems. Institutions provide expertise.
          Industry and CSR partners help build and deploy solutions.
          Government validates and monitors outcomes.
        </p>
      </div>
    </Container>
  );
}
