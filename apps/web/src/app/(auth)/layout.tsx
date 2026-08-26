import Link from "next/link";
import { Container } from "@/components/ui";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border">
        <Container className="h-16 flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            RAAH
          </Link>
          <Link href="/" className="text-sm text-muted hover:text-foreground">
            Back to home
          </Link>
        </Container>
      </header>
      <main className="flex-1 flex items-start justify-center py-16">
        <div className="w-full max-w-md px-6">{children}</div>
      </main>
    </div>
  );
}
