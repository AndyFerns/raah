import { Container } from "@/components/ui";

export function ModuleStub({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <Container className="py-24 max-w-2xl">
      <p className="eyebrow mb-3">{eyebrow}</p>
      <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
        {title}
      </h1>
      <p className="mt-4 text-muted leading-relaxed">{description}</p>
      <p className="mt-8 text-xs text-muted uppercase tracking-widest">
        Coming soon
      </p>
    </Container>
  );
}
