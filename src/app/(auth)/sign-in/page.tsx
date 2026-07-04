import type { Metadata } from "next";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Sign in · Revio" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">Welcome back</h1>
      <p className="mb-8 mt-1.5 text-sm text-muted-fg">Sign in to rent and manage your gear.</p>
      <AuthForm mode="sign-in" callbackUrl={callbackUrl} />
    </div>
  );
}
