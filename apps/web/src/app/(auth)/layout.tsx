import Link from "next/link";
import { PathwayArtifact, RaahMark } from "@/components/mark";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* Left: form */}
      <div className="flex flex-col bg-background">
        <header className="border-b border-border">
          <div className="px-6 md:px-10 h-16 flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 text-lg font-semibold tracking-tight"
            >
              <RaahMark size={22} />
              <span>Raah</span>
            </Link>
            <Link
              href="/"
              className="text-sm text-muted hover:text-foreground"
            >
              Back to home
            </Link>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center py-12 px-6">
          <div className="w-full max-w-md">{children}</div>
        </main>
        <footer className="hidden lg:block px-10 py-6 text-xs text-muted-2 border-t border-border">
          Government of Jharkhand · Raah
        </footer>
      </div>

      {/* Right: decorative panel. Hidden on small screens. */}
      <aside
        className="hidden lg:flex relative overflow-hidden flex-col justify-between p-10 bg-[color:var(--surface-2)] border-l border-border"
      >
        <div className="absolute inset-0 pointer-events-none opacity-70 bg-dots" />
        <div className="absolute -right-16 -bottom-16 w-[560px] h-[560px] text-[color:var(--accent-2)] opacity-60 pointer-events-none">
          <PathwayArtifact className="w-full h-full" />
        </div>

        <div className="relative">
          <p className="eyebrow flex items-center gap-3">
            <span className="inline-block w-8 h-px bg-[color:var(--accent)]" />
            Raah
          </p>
          <h2 className="mt-6 text-4xl xl:text-5xl font-semibold tracking-tight leading-tight max-w-md">
            A pathway from real problems to deployable solutions.
          </h2>
          <p className="mt-5 max-w-md text-muted leading-relaxed">
            Sign in to submit challenges, register your institution, or review
            verification submissions across Jharkhand.
          </p>
        </div>

        <div className="relative grid grid-cols-3 gap-3 max-w-md">
          {[
            { t: "Identify", tone: "accent" },
            { t: "Connect", tone: "accent2" },
            { t: "Build", tone: "accent" },
          ].map((s) => (
            <div key={s.t} className="border border-border bg-background p-4">
              <div
                className="h-0.5 w-6 mb-3"
                style={{
                  background:
                    s.tone === "accent"
                      ? "var(--accent)"
                      : "var(--accent-2)",
                }}
              />
              <p className="text-sm font-medium">{s.t}</p>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
