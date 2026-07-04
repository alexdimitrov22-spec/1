import {
  Gamepad2,
  Camera,
  Laptop,
  Speaker,
  Video,
  Plane,
  Glasses,
  Projector,
  Wind,
  Drill,
  Tv,
  Cable,
  Package,
  type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  gamepad: Gamepad2,
  camera: Camera,
  laptop: Laptop,
  speaker: Speaker,
  video: Video,
  drone: Plane,
  glasses: Glasses,
  projector: Projector,
  wind: Wind,
  drill: Drill,
  tv: Tv,
  cable: Cable,
};

export function CategoryIcon({ iconKey, className }: { iconKey?: string | null; className?: string }) {
  const Icon = (iconKey && MAP[iconKey]) || Package;
  return <Icon className={className} />;
}
