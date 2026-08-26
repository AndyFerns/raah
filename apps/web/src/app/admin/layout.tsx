import Link from "next/link";
import { SiteFooter } from "@/components/site-nav";
import { SignOutButton } from "@/components/sign-out-button";
import { Container } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: LayoutProps<"/">) {
  await requireAdmin();
  return (
    <>
      <header className="border-b border-border">
        <Container className="h-16 flex items-center justify-between">
          <Link href="/admin" className="text-lg font-semibold tracking-tight">
            RAAH <span className="text-muted font-normal">Administration</span>
          </Link>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/admin" className="text-foreground hover:text-muted">
              Institutions
            </Link>
            <Link href="/" className="text-muted hover:text-foreground">
              Back to site
            </Link>
            <SignOutButton />
          </div>
        </Container>
      </header>
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
