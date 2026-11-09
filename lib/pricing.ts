import { PRICING, type PricingConfig, type ServiceId } from "@/config/pricing";

/**
 * Pure pricing engine. No I/O, no dates, no globals other than the default config.
 * Every amount is an integer number of cents.
 */

export interface Measurements {
  /** Total panes, patio doors already converted (see totalPanes). */
  panes: number;
  storeys: number;
  walls: number;
}

export interface PricingInput extends Measurements {
  services: ServiceId[];
}

export interface LineItem {
  service: ServiceId;
  quantity: number;
  unitCents: number;
  totalCents: number;
}

export interface VisitPrice {
  lines: LineItem[];
  subtotalCents: number;
  minimumApplied: boolean;
  totalCents: number;
}

export interface AnnualPlanPrice {
  visits: VisitPrice[];
  annualCents: number;
  monthlyCents: number;
  /** Selected services that are not part of the plan, billed once at the regular rate. */
  addOns: LineItem[];
  addOnsCents: number;
}

export interface PriceQuote {
  oneTime: VisitPrice;
  annualPlan: AnnualPlanPrice | null;
}

const SERVICE_ORDER: ServiceId[] = ["windows", "gutters", "houseWash"];

export function totalPanes(
  panesPerSide: { front: number; back: number; left: number; right: number },
  patioDoors: number,
  config: PricingConfig = PRICING,
): number {
  const sides = panesPerSide.front + panesPerSide.back + panesPerSide.left + panesPerSide.right;
  return sides + patioDoors * config.panesPerPatioDoor;
}

export function priceQuote(input: PricingInput, config: PricingConfig = PRICING): PriceQuote {
  assertCount("panes", input.panes);
  assertCount("storeys", input.storeys);
  assertCount("walls", input.walls);
  const services = SERVICE_ORDER.filter((s) => input.services.includes(s));
  if (services.length === 0) throw new RangeError("At least one service is required");

  // Windows drop to the discounted rate when gutters are done in the same visit.
  const oneTimeWindowRate = services.includes("gutters")
    ? config.windows.discountedPerPaneCents
    : config.windows.perPaneCents;
  const oneTime = priceVisit(services, input, oneTimeWindowRate, config);

  return { oneTime, annualPlan: priceAnnualPlan(services, input, config) };
}

function priceAnnualPlan(
  selected: ServiceId[],
  m: Measurements,
  config: PricingConfig,
): AnnualPlanPrice | null {
  const plan = config.annualPlan;
  if (!selected.includes(plan.offeredWhen)) return null;

  const visits = plan.visits.map((visitServices) =>
    priceVisit(orderServices(visitServices), m, config.windows.discountedPerPaneCents, config),
  );
  const annualCents = sum(visits.map((v) => v.totalCents));

  const inPlan = new Set(plan.visits.flat());
  const addOns = selected
    .filter((s) => !inPlan.has(s))
    .map((s) => lineFor(s, m, config.windows.perPaneCents, config));

  return {
    visits,
    annualCents,
    monthlyCents: Math.round(annualCents / 12),
    addOns,
    addOnsCents: sum(addOns.map((l) => l.totalCents)),
  };
}

function priceVisit(
  services: ServiceId[],
  m: Measurements,
  windowRateCents: number,
  config: PricingConfig,
): VisitPrice {
  const lines = services.map((s) => lineFor(s, m, windowRateCents, config));
  const subtotalCents = sum(lines.map((l) => l.totalCents));
  const totalCents = Math.max(subtotalCents, config.minimumPerVisitCents);
  return { lines, subtotalCents, minimumApplied: totalCents > subtotalCents, totalCents };
}

function lineFor(
  service: ServiceId,
  m: Measurements,
  windowRateCents: number,
  config: PricingConfig,
): LineItem {
  const [quantity, unitCents] =
    service === "windows"
      ? [m.panes, windowRateCents]
      : service === "gutters"
        ? [m.storeys, config.gutters.perStoreyCents]
        : [m.walls, config.houseWash.perWallCents];
  return { service, quantity, unitCents, totalCents: quantity * unitCents };
}

function orderServices(services: ServiceId[]): ServiceId[] {
  return SERVICE_ORDER.filter((s) => services.includes(s));
}

function assertCount(name: string, value: number) {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative integer (got ${value})`);
  }
}

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
