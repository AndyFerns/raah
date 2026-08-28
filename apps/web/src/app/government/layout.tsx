import Link from "next/link";
import { RaahMark } from "@/components/mark";
import { SignOutButton } from "@/components/sign-out-button";
import { Container } from "@/components/ui";

function GovHeader() {
  return (
    <header className="border-b border-border bg-background/90 backdrop-blur-sm sticky top-0 z-40">
      <Container className="flex h-14 items-center justify-between px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground"
        >
          <RaahMark size={20} />
          <span>Raah</span>
        </Link>
        <div className="flex items-center gap-6 text-sm font-medium">
          <Link href="/" className="text-foreground hover:text-muted">
            Home
          </Link>
          <SignOutButton />
        </div>
      </Container>
    </header>
  );
}

export default function GovernmentLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <GovHeader />
      <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
    </>
  );
}
