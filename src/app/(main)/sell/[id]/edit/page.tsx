import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCategories } from "@/server/listing-service";
import { ListingForm } from "../../listing-form";
import { updateListingAction } from "../../actions";

export const metadata: Metadata = { title: "Edit listing" };

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/sign-in?callbackUrl=/sell/${id}/edit`);

  const [listing, categories] = await Promise.all([
    prisma.listing.findUnique({
      where: { id },
      include: { images: { orderBy: { order: "asc" } } },
    }),
    getCategories(),
  ]);

  if (!listing) notFound();
  if (listing.ownerId !== session.user.id) redirect("/dashboard");

  const action = updateListingAction.bind(null, listing.id);

  return (
    <div className="container max-w-2xl py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Edit listing</h1>
        <p className="mt-2 text-muted-fg">Update details, pricing, or availability.</p>
      </header>
      <ListingForm
        action={action}
        categories={categories}
        submitLabel="Save changes"
        defaults={{
          title: listing.title,
          description: listing.description,
          categoryId: listing.categoryId,
          brand: listing.brand ?? undefined,
          model: listing.model ?? undefined,
          condition: listing.condition,
          priceDaily: listing.priceDailyCents / 100,
          priceWeekly: listing.priceWeeklyCents ? listing.priceWeeklyCents / 100 : undefined,
          priceMonthly: listing.priceMonthlyCents ? listing.priceMonthlyCents / 100 : undefined,
          deposit: listing.depositCents / 100,
          city: listing.city ?? undefined,
          country: listing.country ?? undefined,
          instantBook: listing.instantBook,
          deliveryAvailable: listing.deliveryAvailable,
          deliveryFee: listing.deliveryFeeCents ? listing.deliveryFeeCents / 100 : undefined,
          accessories: listing.accessories,
          imageUrls: listing.images.map((i) => i.url),
        }}
      />
    </div>
  );
}
