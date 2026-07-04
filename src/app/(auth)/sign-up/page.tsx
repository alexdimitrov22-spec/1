import type { Metadata } from "next";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Create your account · Revio" };

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">Create your account</h1>
      <p className="mb-8 mt-1.5 text-sm text-muted-fg">
        Join Revio to rent gear or earn from what you own.
      </p>
      <AuthForm mode="sign-up" callbackUrl={callbackUrl} />
    </div>
  );
}
