"use client";

import { useActionState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ImageUploader } from "@/components/image-uploader";
import type { ListingFormState } from "./actions";

type Category = { id: string; name: string };

export interface ListingDefaults {
  title?: string;
  description?: string;
  categoryId?: string;
  brand?: string;
  model?: string;
  condition?: string;
  priceDaily?: number;
  priceWeekly?: number;
  priceMonthly?: number;
  deposit?: number;
  city?: string;
  country?: string;
  instantBook?: boolean;
  deliveryAvailable?: boolean;
  deliveryFee?: number;
  accessories?: string[];
  imageUrls?: string[];
}

const CONDITIONS = ["NEW", "LIKE_NEW", "EXCELLENT", "GOOD", "FAIR"];

export function ListingForm({
  action,
  categories,
  defaults = {},
  submitLabel = "Publish listing",
}: {
  action: (prev: ListingFormState, formData: FormData) => Promise<ListingFormState>;
  categories: Category[];
  defaults?: ListingDefaults;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState<ListingFormState, FormData>(action, undefined);

  return (
    <form action={formAction} className="space-y-8">
      <Section title="Photos" hint="The first photo is used as the cover. Add at least one.">
        <ImageUploader initial={defaults.imageUrls ?? []} />
      </Section>

      <Section title="The basics">
        <Field label="Title">
          <Input name="title" defaultValue={defaults.title} placeholder="Sony A7 IV mirrorless body" required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category">
            <Select name="categoryId" defaultValue={defaults.categoryId} required>
              <option value="">Choose a category…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Condition">
            <Select name="condition" defaultValue={defaults.condition ?? "EXCELLENT"}>
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c.replace("_", " ").toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase())}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Brand" optional>
            <Input name="brand" defaultValue={defaults.brand} placeholder="Sony" />
          </Field>
          <Field label="Model" optional>
            <Input name="model" defaultValue={defaults.model} placeholder="A7 IV" />
          </Field>
        </div>
        <Field label="Description">
          <Textarea
            name="description"
            defaultValue={defaults.description}
            placeholder="Tell renters what's included, any quirks, and how to look after it."
            required
          />
        </Field>
        <Field label="Included accessories" optional hint="Comma-separated, e.g. 2 batteries, charger, 64GB SD card">
          <Input name="accessories" defaultValue={defaults.accessories?.join(", ")} placeholder="2 batteries, charger, 64GB SD card" />
        </Field>
      </Section>

      <Section title="Pricing" hint="Amounts in whole currency units (e.g. 35 = £35). Deposit is a refundable hold.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Per day">
            <MoneyInput name="priceDaily" defaultValue={defaults.priceDaily} required />
          </Field>
          <Field label="Per week" optional>
            <MoneyInput name="priceWeekly" defaultValue={defaults.priceWeekly} />
          </Field>
          <Field label="Per month" optional>
            <MoneyInput name="priceMonthly" defaultValue={defaults.priceMonthly} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Refundable deposit">
            <MoneyInput name="deposit" defaultValue={defaults.deposit ?? 0} />
          </Field>
          <Field label="Currency">
            <Select name="currency" defaultValue="GBP">
              <option value="GBP">GBP £</option>
              <option value="EUR">EUR €</option>
              <option value="USD">USD $</option>
            </Select>
          </Field>
        </div>
      </Section>

      <Section title="Location & fulfilment">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="City" optional>
            <Input name="city" defaultValue={defaults.city} placeholder="London" />
          </Field>
          <Field label="Country" optional hint="2-letter code, e.g. GB">
            <Input name="country" defaultValue={defaults.country} placeholder="GB" maxLength={2} />
          </Field>
        </div>
        <label className="flex items-center gap-3 text-sm text-ink">
          <input type="checkbox" name="instantBook" defaultChecked={defaults.instantBook} className="h-4 w-4 rounded border-line accent-accent" />
          Allow instant book (no manual approval)
        </label>
        <label className="flex items-center gap-3 text-sm text-ink">
          <input type="checkbox" name="deliveryAvailable" defaultChecked={defaults.deliveryAvailable} className="h-4 w-4 rounded border-line accent-accent" />
          Offer delivery
        </label>
        <Field label="Delivery fee" optional>
          <MoneyInput name="deliveryFee" defaultValue={defaults.deliveryFee} />
        </Field>
      </Section>

      {state?.error && (
        <p className="flex items-center gap-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          <AlertCircle className="h-4 w-4 shrink-0" /> {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
        <Button type="submit" name="publish" value="draft" variant="outline" disabled={pending}>
          Save as draft
        </Button>
      </div>
    </form>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {hint && <p className="mt-1 text-sm text-muted-fg">{hint}</p>}
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  optional,
  hint,
  children,
}: {
  label: string;
  optional?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {optional && <span className="ml-1.5 text-xs font-normal text-muted-fg">optional</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-fg">{hint}</p>}
    </div>
  );
}

function MoneyInput({
  name,
  defaultValue,
  required,
}: {
  name: string;
  defaultValue?: number;
  required?: boolean;
}) {
  return (
    <Input
      name={name}
      type="number"
      min={0}
      step="0.01"
      inputMode="decimal"
      defaultValue={defaultValue}
      required={required}
      className="font-mono tabular"
    />
  );
}
