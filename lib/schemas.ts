import { z } from "zod";

export const SIDES = ["front", "back", "left", "right"] as const;
export type Side = (typeof SIDES)[number];

export const SERVICES = ["windows", "gutters", "houseWash"] as const;
export const ServiceSchema = z.enum(SERVICES);

export const LocaleSchema = z.enum(["fr", "en"]);

// ---------------------------------------------------------------------------
// AI analysis — the exact JSON the vision model must return.
// Counting rule: every piece of glass = 1 pane; patio doors are NOT in
// panes_per_side, they are counted in patio_doors (2 panes each at pricing time).
// ---------------------------------------------------------------------------

const paneCount = z.number().int().min(0).max(300);

export const AnalysisSchema = z.object({
  panes_per_side: z.object({
    front: paneCount,
    back: paneCount,
    left: paneCount,
    right: paneCount,
  }),
  patio_doors: z.number().int().min(0).max(20),
  storeys: z.number().int().min(1).max(10),
  walls: z.number().int().min(1).max(30),
  obstructions: z.array(z.string().max(300)).max(30),
  confidence: z.number().min(0).max(1),
  notes: z.string().max(3000),
});
export type Analysis = z.infer<typeof AnalysisSchema>;

// ---------------------------------------------------------------------------
// Requests from the browser
// ---------------------------------------------------------------------------

export const AddressSchema = z.object({
  formatted: z.string().trim().min(5).max(300),
  placeId: z.string().max(500).nullable(),
  lat: z.number().min(-90).max(90).nullable(),
  lng: z.number().min(-180).max(180).nullable(),
});
export type Address = z.infer<typeof AddressSchema>;

/** Keeps the 10 digits of a North American number: "+1 (450) 555-1234" → "4505551234". */
export function normalizePhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  return /^[2-9]\d{2}[2-9]\d{6}$/.test(digits) ? digits : null;
}

export const ContactSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  phone: z
    .string()
    .max(30)
    .transform((v, ctx) => {
      const phone = normalizePhone(v);
      if (!phone) {
        ctx.addIssue({ code: "custom", message: "invalid_phone" });
        return z.NEVER;
      }
      return phone;
    }),
  email: z.string().trim().toLowerCase().max(200).pipe(z.email()),
});
export type Contact = z.infer<typeof ContactSchema>;

export const PhotoRefSchema = z.object({
  url: z.string().max(1000),
  /** HMAC issued by /api/photos — proves the URL came from our own upload route. */
  sig: z.string().max(200),
});
export type PhotoRef = z.infer<typeof PhotoRefSchema>;

export const QuoteRequestSchema = z.object({
  quoteId: z.uuid(),
  locale: LocaleSchema,
  address: AddressSchema,
  services: z.array(ServiceSchema).min(1).max(3),
  photos: z.object({
    front: PhotoRefSchema,
    back: PhotoRefSchema,
    left: PhotoRefSchema,
    right: PhotoRefSchema,
  }),
  contact: ContactSchema,
  consent: z.literal(true),
  /** Honeypot: humans never see this field, so it must stay empty. */
  website: z.string().max(0).optional(),
});
export type QuoteRequest = z.infer<typeof QuoteRequestSchema>;

export const AcceptOptionSchema = z.enum(["annual_plan", "one_time"]);
export type AcceptOption = z.infer<typeof AcceptOptionSchema>;

export const AcceptRequestSchema = z.object({
  token: z.string().min(10).max(40_000),
  option: AcceptOptionSchema,
});

export const UploadFieldsSchema = z.object({
  quoteId: z.uuid(),
  side: z.enum(SIDES),
});
