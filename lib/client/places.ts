/**
 * Google Places (New) autocomplete — used ONLY to help type the address.
 * No map, satellite or Street View imagery is ever requested.
 */

export interface AddressSuggestion {
  id: string;
  main: string;
  secondary: string;
  prediction: google.maps.places.PlacePrediction;
}

export interface ResolvedAddress {
  formatted: string;
  placeId: string;
  lat: number | null;
  lng: number | null;
}

const SAINT_COLOMBAN = { lat: 45.7303, lng: -74.1338 };
let loading: Promise<google.maps.PlacesLibrary> | null = null;

export function loadPlaces(apiKey: string, language: string): Promise<google.maps.PlacesLibrary> {
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const callback = "__zfPlacesReady";
    (window as unknown as Record<string, () => void>)[callback] = () => {
      google.maps.importLibrary("places").then((lib) => resolve(lib as google.maps.PlacesLibrary), reject);
    };
    const script = document.createElement("script");
    const params = new URLSearchParams({ key: apiKey, loading: "async", language, region: "CA", callback });
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    script.async = true;
    script.onerror = () => {
      loading = null;
      reject(new Error("places_load_failed"));
    };
    document.head.appendChild(script);
  });
  return loading;
}

export async function fetchSuggestions(
  lib: google.maps.PlacesLibrary,
  input: string,
  sessionToken: google.maps.places.AutocompleteSessionToken,
  language: string,
): Promise<AddressSuggestion[]> {
  const { suggestions } = await lib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
    input,
    sessionToken,
    language,
    region: "ca",
    includedRegionCodes: ["ca"],
    locationBias: { center: SAINT_COLOMBAN, radius: 50_000 },
  });
  return suggestions.flatMap((s) => {
    const p = s.placePrediction;
    if (!p) return [];
    return [
      {
        id: p.placeId,
        main: p.mainText?.text ?? p.text.text,
        secondary: p.secondaryText?.text ?? "",
        prediction: p,
      },
    ];
  });
}

export async function resolveSuggestion(suggestion: AddressSuggestion): Promise<ResolvedAddress> {
  const place = suggestion.prediction.toPlace();
  await place.fetchFields({ fields: ["formattedAddress", "location"] });
  return {
    formatted: place.formattedAddress ?? `${suggestion.main}, ${suggestion.secondary}`,
    placeId: suggestion.id,
    lat: place.location?.lat() ?? null,
    lng: place.location?.lng() ?? null,
  };
}
