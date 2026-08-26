import { SiteFooter, SiteNav } from "@/components/site-nav";

export default function InstitutionLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteNav />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
