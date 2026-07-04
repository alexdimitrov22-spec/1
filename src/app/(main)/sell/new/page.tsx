import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCategories } from "@/server/listing-service";
import { ListingForm } from "../listing-form";
import { createListingAction } from "../actions";

export const metadata: Metadata = { title: "List your gear" };

export default async function NewListingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/sell/new");

  const categories = await getCategories();

  return (
    <div className="container max-w-2xl py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">List your gear</h1>
        <p className="mt-2 text-muted-fg">
          Earn from equipment sitting idle. You stay in control — set your price,
          deposit, and whether renters can book instantly.
        </p>
      </header>
      <ListingForm action={createListingAction} categories={categories} />
    </div>
  );
}
