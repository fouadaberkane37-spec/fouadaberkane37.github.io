/**
 * ALL prices live here. Change a number, redeploy, done — no logic to touch.
 * Amounts are in cents (CAD), before taxes (TPS/TVQ en sus).
 */

export type ServiceId = "windows" | "gutters" | "houseWash";

export interface PricingConfig {
  windows: {
    /** One-time price per pane. */
    perPaneCents: number;
    /** Per-pane price on the annual plan, or when gutters are booked in the same visit. */
    discountedPerPaneCents: number;
  };
  gutters: {
    /** Gutter cleaning = this × number of storeys. */
    perStoreyCents: number;
  };
  houseWash: {
    /** House wash = this × number of walls. */
    perWallCents: number;
  };
  /** No single visit is ever billed below this. */
  minimumPerVisitCents: number;
  /** A patio door counts as this many panes. */
  panesPerPatioDoor: number;
  annualPlan: {
    /** The plan is only offered when the customer picked this service. */
    offeredWhen: ServiceId;
    /** Each entry is one visit per year and what is done during it (windows at the discounted rate). */
    visits: ServiceId[][];
  };
}

export const PRICING: PricingConfig = {
  windows: {
    perPaneCents: 1000, // 10,00 $
    discountedPerPaneCents: 750, // 7,50 $
  },
  gutters: {
    perStoreyCents: 15000, // 150 $ par étage
  },
  houseWash: {
    perWallCents: 20000, // 200 $ par mur
  },
  minimumPerVisitCents: 15000, // 150 $
  panesPerPatioDoor: 2,
  annualPlan: {
    offeredWhen: "windows",
    visits: [
      ["windows", "gutters"], // visite 1 : vitres + gouttières
      ["windows"], // visite 2 : vitres
    ],
  },
};
