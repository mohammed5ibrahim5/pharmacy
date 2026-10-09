import {
  Truck,
  BadgePercent,
  BadgeCheck,
  PhoneCall,
  Clock,
  ShieldCheck,
  Lock,
  Zap,
  Star,
  type LucideIcon,
} from 'lucide-react';

export const HERO_BADGE_ICON_MAP: Record<string, LucideIcon> = {
  truck: Truck,
  badgepercent: BadgePercent,
  badgecheck: BadgeCheck,
  phone: PhoneCall,
  clock: Clock,
  shieldcheck: ShieldCheck,
  lock: Lock,
  zap: Zap,
  star: Star,
};

export const HERO_BADGE_ICON_KEYS = Object.keys(HERO_BADGE_ICON_MAP);

export function heroBadgeIcon(icon: string): LucideIcon {
  return HERO_BADGE_ICON_MAP[icon] || BadgeCheck;
}
