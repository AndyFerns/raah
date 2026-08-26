import Link from "next/link";
import { SignInForm } from "./sign-in-form";

export const metadata = { title: "Sign in — Raah" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const errorMsg = params.error ?? null;

  return (
    <div>
      <p className="eyebrow mb-3 flex items-center gap-3">
        <span className="inline-block w-8 h-px bg-[color:var(--accent)]" />
        Welcome back
      </p>
      <h1 className="text-3xl font-semibold tracking-tight">
        Sign in to Raah
      </h1>
      <p className="mt-2 text-sm text-muted">
        Use your Raah account, or continue with Google.
      </p>

      {errorMsg && (
        <div className="mt-6 border border-[color:var(--danger)] bg-[color:var(--surface-3)] p-3 text-sm text-[color:var(--danger)]">
          {errorMsg}
        </div>
      )}

      <div className="mt-8">
        <SignInForm />
      </div>
      <p className="mt-6 text-sm text-muted">
        New to Raah?{" "}
        <Link
          href="/auth/register"
          className="text-[color:var(--accent)] underline underline-offset-4"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
