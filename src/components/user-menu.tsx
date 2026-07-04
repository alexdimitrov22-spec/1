"use client";

import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { LayoutDashboard, PlusCircle, CalendarCheck, User as UserIcon, LogOut } from "lucide-react";
import { signOutAction } from "@/server/auth-actions";

export function UserMenu({
  name,
  email,
  image,
}: {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}) {
  const initials = (name ?? email ?? "?")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-accent-soft text-sm font-semibold text-accent ring-1 ring-line transition hover:ring-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label="Account menu"
        >
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-56 rounded-xl border border-line bg-surface p-1.5 shadow-pop"
        >
          <div className="px-2.5 py-2">
            <p className="truncate text-sm font-medium text-ink">{name ?? "Your account"}</p>
            {email && <p className="truncate text-xs text-muted-fg">{email}</p>}
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-line" />

          <MenuLink href="/dashboard" icon={<LayoutDashboard className="h-4 w-4" />}>
            Dashboard
          </MenuLink>
          <MenuLink href="/bookings" icon={<CalendarCheck className="h-4 w-4" />}>
            My rentals
          </MenuLink>
          <MenuLink href="/sell/new" icon={<PlusCircle className="h-4 w-4" />}>
            List an item
          </MenuLink>
          <MenuLink href="/account" icon={<UserIcon className="h-4 w-4" />}>
            Account
          </MenuLink>

          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          <DropdownMenu.Item asChild>
            <form action={signOutAction}>
              <button className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-ink outline-none data-[highlighted]:bg-muted">
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </form>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function MenuLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <DropdownMenu.Item asChild>
      <Link
        href={href}
        className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-ink outline-none data-[highlighted]:bg-muted"
      >
        {icon}
        {children}
      </Link>
    </DropdownMenu.Item>
  );
}
