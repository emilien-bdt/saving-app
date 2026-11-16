import {
  Briefcase,
  Car,
  Circle,
  CreditCard,
  Gift,
  GraduationCap,
  HandCoins,
  House,
  Landmark,
  type LucideIcon,
  PartyPopper,
  PiggyBank,
  Plane,
  Repeat,
  Shapes,
  Shield,
  ShoppingCart,
  Utensils,
  Wallet,
} from "lucide-react";
import type { IconName } from "../domain/icons";

/** Icons available for accounts and categories (names stored in the database). */
const ICONS: Record<IconName, LucideIcon> = {
  briefcase: Briefcase,
  car: Car,
  "credit-card": CreditCard,
  gift: Gift,
  "graduation-cap": GraduationCap,
  "hand-coins": HandCoins,
  house: House,
  landmark: Landmark,
  "party-popper": PartyPopper,
  "piggy-bank": PiggyBank,
  plane: Plane,
  repeat: Repeat,
  shapes: Shapes,
  shield: Shield,
  "shopping-cart": ShoppingCart,
  utensils: Utensils,
  wallet: Wallet,
};

export function CategoryIcon({ icon, className }: { icon: string | null; className?: string }) {
  const Icon = (icon && icon in ICONS ? ICONS[icon as IconName] : undefined) ?? Circle;
  return <Icon className={className} aria-hidden />;
}
