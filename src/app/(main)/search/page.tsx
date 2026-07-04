import type { Metadata } from "next";
import Link from "next/link";
import { Search as SearchIcon, SlidersHorizontal } from "lucide-react";
import { searchListings, getCategories, type SearchParams } from "@/server/listing-service";
import { ListingCard } from "@/components/listing-card";
import { CategoryIcon } from "@/components/category-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Browse gear" };

type RawParams = Record<string, string | string[] | undefined>;

function num(v: string | string[] | undefined) {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}
function str(v: string | string[] | undefined) {
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.length ? s : undefined;
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const sp = await searchParams;
  const params: SearchParams = {
    q: str(sp.q),
    category: str(sp.category),
    city: str(sp.city),
    minPrice: num(sp.minPrice),
    maxPrice: num(sp.maxPrice),
    instantBook: str(sp.instantBook) === "1",
    sort: (str(sp.sort) as SearchParams["sort"]) ?? "recent",
  };

  const [results, categories] = await Promise.all([
    searchListings(params).catch(() => []),
    getCategories().catch(() => []),
  ]);

  return (
    <div className="container py-8">
      {/* Search bar */}
      <form method="get" className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-fg" />
          <Input name="q" defaultValue={params.q} placeholder="Search gear…" className="pl-10" />
        </div>
        {params.category && <input type="hidden" name="category" value={params.category} />}
        <Select name="sort" defaultValue={params.sort} className="w-auto min-w-[150px]">
          <option value="recent">Newest</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
        </Select>
        <Button type="submit" variant="ink">
          <SlidersHorizontal className="h-4 w-4" /> Apply
        </Button>
      </form>

      {/* Category chips */}
      {categories.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          <CategoryChip href={buildHref(params, { category: undefined })} active={!params.category}>
            All
          </CategoryChip>
          {categories.map((c) => (
            <CategoryChip
              key={c.id}
              href={buildHref(params, { category: c.slug })}
              active={params.category === c.slug}
              iconKey={c.iconKey}
            >
              {c.name}
            </CategoryChip>
          ))}
        </div>
      )}

      <p className="mt-6 text-sm text-muted-fg">
        {results.length} {results.length === 1 ? "result" : "results"}
        {params.q && <> for “{params.q}”</>}
      </p>

      {results.length > 0 ? (
        <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {results.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-line bg-surface p-12 text-center">
          <p className="text-muted-fg">Nothing matched. Try a broader search or clear filters.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/search">Clear filters</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

function buildHref(params: SearchParams, overrides: Partial<SearchParams>) {
  const merged = { ...params, ...overrides };
  const q = new URLSearchParams();
  if (merged.q) q.set("q", merged.q);
  if (merged.category) q.set("category", merged.category);
  if (merged.city) q.set("city", merged.city);
  if (merged.sort && merged.sort !== "recent") q.set("sort", merged.sort);
  if (merged.instantBook) q.set("instantBook", "1");
  const s = q.toString();
  return s ? `/search?${s}` : "/search";
}

function CategoryChip({
  href,
  active,
  iconKey,
  children,
}: {
  href: string;
  active: boolean;
  iconKey?: string | null;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition",
        active
          ? "border-accent bg-accent text-accent-fg"
          : "border-line bg-surface text-ink hover:border-accent/40",
      )}
    >
      {iconKey && <CategoryIcon iconKey={iconKey} className="h-4 w-4" />}
      {children}
    </Link>
  );
}
