import Link from "next/link";
import { Logo } from "@/components/logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="container grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs text-sm text-muted-fg">
            Peer-to-peer electronics rental — verified people, escrow payments,
            condition on the record.
          </p>
        </div>
        <FooterCol
          title="Rent"
          links={[
            ["Browse gear", "/search"],
            ["How it works", "/how-it-works"],
            ["Trust & safety", "/trust"],
          ]}
        />
        <FooterCol
          title="Earn"
          links={[
            ["List an item", "/sell/new"],
            ["Lender guide", "/lenders"],
            ["Payouts", "/payouts"],
          ]}
        />
        <FooterCol
          title="Company"
          links={[
            ["About", "/about"],
            ["Terms", "/terms"],
            ["Privacy", "/privacy"],
          ]}
        />
      </div>
      <div className="border-t border-line">
        <div className="container flex h-14 items-center justify-between text-xs text-muted-fg">
          <span>© {new Date().getFullYear()} Revio</span>
          <span>Made for renters and lenders alike.</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-ink">{title}</h4>
      <ul className="space-y-2 text-sm text-muted-fg">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link href={href} className="hover:text-ink">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
