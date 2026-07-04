import Link from "next/link";
import { Search } from "lucide-react";
import { auth } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";

export async function SiteHeader() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/80 backdrop-blur">
      <div className="container flex h-16 items-center gap-4">
        <Link href="/" className="shrink-0">
          <Logo />
        </Link>

        <nav className="ml-4 hidden items-center gap-1 text-sm md:flex">
          <Link href="/search" className="rounded-full px-3 py-2 text-muted-fg hover:text-ink">
            Browse
          </Link>
          <Link href="/sell/new" className="rounded-full px-3 py-2 text-muted-fg hover:text-ink">
            List your gear
          </Link>
        </nav>

        <Link
          href="/search"
          className="ml-auto hidden h-10 items-center gap-2 rounded-full border border-line bg-muted px-4 text-sm text-muted-fg transition hover:border-accent/40 sm:flex"
        >
          <Search className="h-4 w-4" />
          Search cameras, consoles, drones…
        </Link>

        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          {session?.user ? (
            <UserMenu
              name={session.user.name}
              email={session.user.email}
              image={session.user.image}
            />
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/sign-up">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
