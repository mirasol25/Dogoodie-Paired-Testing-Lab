import "server-only";

import tzlookup from "tz-lookup";
import type { GeocodingResult } from "@/lib/geocoding/types";

const supportedMarkets: Record<string, { currencyCode: string }> = {
  PH: { currencyCode: "PHP" },
  US: { currencyCode: "USD" },
  CA: { currencyCode: "CAD" },
};

export type SupportedMarketCode = keyof typeof supportedMarkets;

let requestQueue: Promise<void> = Promise.resolve();
let lastRequestAt = 0;

async function scheduledFetch(url: URL): Promise<Response> {
  const previous = requestQueue;
  let release!: () => void;
  requestQueue = new Promise<void>((resolve) => { release = resolve; });
  await previous;
  const wait = Math.max(0, 1_000 - (Date.now() - lastRequestAt));
  if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "DoGoodie-Paired-Testing-Lab/0.1 (internal research tool)",
        "Accept-Language": "en",
      },
      cache: "no-store",
    });
    lastRequestAt = Date.now();
    return response;
  } finally {
    release();
  }
}

interface NominatimPlace {
  place_id?: number;
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    country_code?: string;
    state?: string;
    region?: string;
    province?: string;
  };
}

function normalizePlace(place: NominatimPlace): GeocodingResult | null {
  const latitude = Number(place.lat);
  const longitude = Number(place.lon);
  const countryCode = place.address?.country_code?.toUpperCase() ?? "";
  const market = supportedMarkets[countryCode];
  if (!market || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    formattedAddress: place.display_name,
    latitude,
    longitude,
    countryCode,
    regionName: place.address?.state || place.address?.region || place.address?.province || null,
    currencyCode: market.currencyCode,
    timezone: tzlookup(latitude, longitude),
    externalPlaceId: place.place_id ? String(place.place_id) : null,
    geocodingProvider: "nominatim",
  };
}

export async function searchLocations(query: string, countryCode: SupportedMarketCode): Promise<GeocodingResult[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("countrycodes", countryCode.toLowerCase());
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "5");
  const response = await scheduledFetch(url);
  if (!response.ok) throw new Error("The location search provider is unavailable.");
  const places = await response.json() as NominatimPlace[];
  return places.map(normalizePlace).filter((place): place is GeocodingResult => Boolean(place));
}

export async function reverseLocation(latitude: number, longitude: number): Promise<GeocodingResult> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  const response = await scheduledFetch(url);
  if (!response.ok) throw new Error("The location lookup provider is unavailable.");
  const place = normalizePlace(await response.json() as NominatimPlace);
  if (!place) throw new Error("This location is outside the configured pilot markets.");
  return place;
}
