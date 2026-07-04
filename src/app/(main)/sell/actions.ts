"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { createListing, updateListing, listingInputSchema } from "@/server/listing-service";

export type ListingFormState = { error?: string } | undefined;

function parseForm(formData: FormData) {
  return {
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    categoryId: String(formData.get("categoryId") ?? ""),
    brand: String(formData.get("brand") ?? "") || undefined,
    model: String(formData.get("model") ?? "") || undefined,
    condition: String(formData.get("condition") ?? "GOOD"),
    priceDaily: formData.get("priceDaily"),
    priceWeekly: formData.get("priceWeekly") || undefined,
    priceMonthly: formData.get("priceMonthly") || undefined,
    deposit: formData.get("deposit") || 0,
    currency: String(formData.get("currency") ?? "GBP"),
    city: String(formData.get("city") ?? "") || undefined,
    country: String(formData.get("country") ?? "") || undefined,
    instantBook: formData.get("instantBook") === "on",
    deliveryAvailable: formData.get("deliveryAvailable") === "on",
    deliveryFee: formData.get("deliveryFee") || undefined,
    accessories: String(formData.get("accessories") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    imageUrls: formData.getAll("imageUrls").map(String).filter(Boolean),
    publish: formData.get("publish") !== "draft",
  };
}

export async function createListingAction(
  _prev: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/sell/new");

  const parsed = listingInputSchema.safeParse(parseForm(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  let slug: string;
  try {
    const listing = await createListing(session.user.id, parsed.data);
    slug = listing.slug;
  } catch {
    return { error: "Could not save the listing. Try again." };
  }

  revalidatePath("/search");
  revalidatePath("/dashboard");
  redirect(`/listings/${slug}`);
}

export async function updateListingAction(
  listingId: string,
  _prev: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const parsed = listingInputSchema.safeParse(parseForm(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  let slug: string;
  try {
    const listing = await updateListing(session.user.id, listingId, parsed.data);
    slug = listing.slug;
  } catch {
    return { error: "Could not update the listing." };
  }

  revalidatePath("/search");
  revalidatePath("/dashboard");
  redirect(`/listings/${slug}`);
}
