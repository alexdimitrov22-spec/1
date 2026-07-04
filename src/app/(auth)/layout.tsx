import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Logo } from "@/components/logo";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="mb-10 inline-flex">
            <Logo />
          </Link>
          {children}
        </div>
      </div>

      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-ink lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_100%_0%,rgba(11,122,84,0.55),transparent_55%)]" />
        <div className="relative flex h-full flex-col justify-end p-14 text-white">
          <blockquote className="max-w-md text-2xl font-medium leading-snug tracking-tight">
            “Rent the gear you need from people nearby — insured, verified, and
            photographed before and after every rental.”
          </blockquote>
          <p className="mt-4 text-sm text-white/60">Revio — the trusted way to rent electronics.</p>
        </div>
      </div>
    </div>
  );
}
