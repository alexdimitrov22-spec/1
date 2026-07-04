import Link from "next/link";
import { ShieldCheck, Camera, HandCoins, ArrowRight, Search } from "lucide-react";
import { searchListings, getCategories } from "@/server/listing-service";
import { ListingCard } from "@/components/listing-card";
import { CategoryIcon } from "@/components/category-icon";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const [categories, featured] = await Promise.all([
    getCategories().catch(() => []),
    searchListings({ sort: "recent" }).catch(() => []),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line bg-surface">
        <div className="absolute inset-0 bg-[radial-gradient(90%_120%_at_50%_-10%,rgba(11,122,84,0.10),transparent_60%)]" />
        <div className="container relative py-20 sm:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
              <ShieldCheck className="h-3.5 w-3.5" /> Verified renters · Escrow · Insured returns
            </span>
            <h1 className="mt-5 text-balance text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
              Rent the gear you need from people nearby
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-pretty text-lg text-muted-fg">
              Cameras, consoles, drones and more — from verified lenders, with
              payments held in escrow and every rental photographed before and after.
            </p>

            <form
              action="/search"
              className="mx-auto mt-8 flex max-w-md items-center gap-2 rounded-full border border-line bg-surface p-1.5 shadow-card"
            >
              <Search className="ml-3 h-5 w-5 text-muted-fg" />
              <input
                name="q"
                placeholder="What do you need to rent?"
                className="h-10 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted-fg"
              />
              <Button type="submit" size="sm">
                Search
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="container py-12">
          <div className="flex flex-wrap justify-center gap-2.5">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/search?category=${c.slug}`}
                className="group inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink shadow-sm transition hover:border-accent/40 hover:text-accent"
              >
                <CategoryIcon iconKey={c.iconKey} className="h-4 w-4 text-muted-fg group-hover:text-accent" />
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured */}
      <section className="container pb-16">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-ink">Fresh on Revio</h2>
            <p className="mt-1 text-sm text-muted-fg">Recently listed gear near you.</p>
          </div>
          <Link href="/search" className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
            Browse all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {featured.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.slice(0, 8).map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-line bg-surface p-12 text-center">
            <p className="text-muted-fg">
              No listings yet. Once the database is seeded (or someone lists an item),
              it appears here.
            </p>
            <Button asChild className="mt-4">
              <Link href="/sell/new">List the first item</Link>
            </Button>
          </div>
        )}
      </section>

      {/* How it works */}
      <section className="border-t border-line bg-surface">
        <div className="container py-16">
          <h2 className="text-center text-2xl font-semibold tracking-tight text-ink">
            Renting, without the worry
          </h2>
          <div className="mx-auto mt-10 grid max-w-4xl gap-8 sm:grid-cols-3">
            <Step
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Verified people"
              body="Every lender and renter passes an ID check before any money moves."
            />
            <Step
              icon={<Camera className="h-5 w-5" />}
              title="Condition on the record"
              body="A five-shot photo capture at pickup and return settles disputes fairly."
            />
            <Step
              icon={<HandCoins className="h-5 w-5" />}
              title="Escrow payments"
              body="Rent is held safely and only released to the lender on a clean return."
            />
          </div>
        </div>
      </section>
    </>
  );
}

function Step({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="text-center">
      <div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-accent-soft text-accent">
        {icon}
      </div>
      <h3 className="mt-4 font-medium text-ink">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-fg">{body}</p>
    </div>
  );
}
