// ============================================================================
// The icon registry — the reason `icon: "PhoneCall"` can no longer be a typo.
//
// Resource records used to carry `icon: string // lucide icon name`, i.e. a
// comment doing a type's job. Registering the icons we actually use and
// deriving the name union from the registry means a misspelled icon is a build
// error, and the mapping from name to component is exhaustive by construction.
// ============================================================================

import {
  Apple,
  BedDouble,
  CreditCard,
  DoorOpen,
  HandCoins,
  HeartPulse,
  Home,
  IdCard,
  LifeBuoy,
  PhoneCall,
  Scale,
  ScrollText,
  Shield,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export const RESOURCE_ICONS = {
  Apple,
  BedDouble,
  CreditCard,
  DoorOpen,
  HandCoins,
  HeartPulse,
  Home,
  IdCard,
  LifeBuoy,
  PhoneCall,
  Scale,
  ScrollText,
  Shield,
  ShieldCheck,
} satisfies Record<string, LucideIcon>;

/** Every icon a curated resource is allowed to name. */
export type ResourceIconName = keyof typeof RESOURCE_ICONS;
