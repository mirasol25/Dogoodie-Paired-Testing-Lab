export interface GeocodingResult {
  formattedAddress: string;
  latitude: number;
  longitude: number;
  countryCode: string;
  regionName: string | null;
  currencyCode: string;
  timezone: string;
  externalPlaceId: string | null;
  geocodingProvider: "nominatim";
}
