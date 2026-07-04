import { Badge, type BadgeProps } from "@/components/ui/badge";

const MAP: Record<string, { label: string; variant: BadgeProps["variant"] }> = {
  PENDING: { label: "Awaiting payment", variant: "warn" },
  CONFIRMED: { label: "Confirmed", variant: "default" },
  ACTIVE: { label: "In progress", variant: "ink" },
  AWAITING_RETURN: { label: "Awaiting return", variant: "warn" },
  COMPLETED: { label: "Completed", variant: "neutral" },
  CANCELLED: { label: "Cancelled", variant: "neutral" },
  DISPUTED: { label: "Disputed", variant: "danger" },
};

export function BookingStatusBadge({ status }: { status: string }) {
  const s = MAP[status] ?? { label: status, variant: "neutral" as const };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}
