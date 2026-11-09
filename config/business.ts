/**
 * Business settings that are not prices. Values marked TODO must be filled in before launch.
 */

export const BUSINESS = {
  name: "ZF Entretien",
  domain: "zfentretien.ca",
  phone: "450-000-0000", // TODO: real phone number
  email: "info@zfentretien.ca", // TODO: confirm address
  /** Law 25: person in charge of the protection of personal information. */
  privacyOfficer: {
    name: "À COMPLÉTER", // TODO
    title: "Responsable de la protection des renseignements personnels",
    email: "confidentialite@zfentretien.ca", // TODO: confirm address
  },
  /** Version of the privacy policy the consent checkbox refers to (sent to Make with each quote). */
  privacyPolicyVersion: "2026-11-09",
  /** How long customer photos are kept before deletion (shown in the privacy policy). */
  photoRetentionMonths: 24, // TODO: confirm
  serviceArea: {
    label: "Saint-Colomban, Saint-Jérôme et les Laurentides jusqu'à Rawdon",
    center: { lat: 45.7303, lng: -74.1338 }, // Saint-Colomban
    /**
     * Addresses farther than this get a quote but are flagged for manual review.
     * Note: Rawdon is ~47 km away and Montréal ~50 km, so a radius only catches far-off addresses.
     */
    radiusKm: 75,
  },
};

export const REVIEW_RULES = {
  /** Below this AI confidence, the price is confirmed by a human. */
  minConfidence: 0.8,
  /** At or above this many storeys, the price is confirmed by a human. */
  manualReviewFromStoreys: 4,
};

export const AI_SETTINGS = {
  defaultModel: "claude-sonnet-5-5",
  /** low | medium | high — higher is slower but more careful. */
  effort: "medium" as const,
  /** Per attempt. The route allows two attempts. */
  timeoutMs: 50_000,
};

/** Requests allowed per IP address per hour. */
export const RATE_LIMITS = {
  photos: 40,
  quote: 8,
  accept: 15,
};
