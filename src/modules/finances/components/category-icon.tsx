import {
  Car,
  Circle,
  HandCoins,
  House,
  Landmark,
  type LucideIcon,
  PartyPopper,
  PiggyBank,
  Repeat,
  Shapes,
  Shield,
  ShoppingCart,
  Utensils,
  Wallet,
} from "lucide-react";

/** Icons available for accounts and categories (names stored in the database). */
const ICONS: Record<string, LucideIcon> = {
  car: Car,
  "hand-coins": HandCoins,
  house: House,
  landmark: Landmark,
  "party-popper": PartyPopper,
  "piggy-bank": PiggyBank,
  repeat: Repeat,
  shapes: Shapes,
  shield: Shield,
  "shopping-cart": ShoppingCart,
  utensils: Utensils,
  wallet: Wallet,
};

export function CategoryIcon({ icon, className }: { icon: string | null; className?: string }) {
  const Icon = (icon ? ICONS[icon] : undefined) ?? Circle;
  return <Icon className={className} aria-hidden />;
}
