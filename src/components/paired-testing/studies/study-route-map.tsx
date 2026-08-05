"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, Map as MapLibreMap, MapMouseEvent, Marker } from "maplibre-gl";
import type { GeocodingResult } from "@/lib/geocoding/types";

export type RoutePointMode = "pickup" | "destination";

const countryViews = {
  PH: { center: [121.0, 14.6] as [number, number], zoom: 5.4 },
  US: { center: [-98.5, 39.5] as [number, number], zoom: 3.2 },
};

export function StudyRouteMap({
  countryCode,
  activeMode,
  pickup,
  destination,
  onCoordinatesChange,
}: {
  countryCode: "PH" | "US";
  activeMode: RoutePointMode;
  pickup: GeocodingResult | null;
  destination: GeocodingResult | null;
  onCoordinatesChange: (mode: RoutePointMode, latitude: number, longitude: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRefs = useRef<Partial<Record<RoutePointMode, Marker>>>({});
  const callbackRef = useRef(onCoordinatesChange);
  const modeRef = useRef(activeMode);

  useEffect(() => { callbackRef.current = onCoordinatesChange; }, [onCoordinatesChange]);
  useEffect(() => { modeRef.current = activeMode; }, [activeMode]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const view = countryViews[countryCode];
    const map = new maplibregl.Map({
      container: containerRef.current,
      center: view.center,
      zoom: view.zoom,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("click", (event: MapMouseEvent) => callbackRef.current(modeRef.current, event.lngLat.lat, event.lngLat.lng));
    map.on("load", () => {
      map.addSource("route-line", {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } },
      });
      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route-line",
        paint: { "line-color": "#30d49c", "line-width": 3, "line-dasharray": [2, 1.5] },
      });
    });
    mapRef.current = map;
    const markers = markerRefs.current;
    return () => {
      Object.values(markers).forEach((marker) => marker?.remove());
      map.remove();
      mapRef.current = null;
    };
  }, [countryCode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const view = countryViews[countryCode];
    map.flyTo({ center: view.center, zoom: view.zoom, duration: 700 });
  }, [countryCode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const points: Array<[RoutePointMode, GeocodingResult | null, string]> = [
      ["pickup", pickup, "#30d49c"],
      ["destination", destination, "#f5b942"],
    ];
    points.forEach(([mode, point, color]) => {
      const existing = markerRefs.current[mode];
      if (!point) {
        existing?.remove();
        delete markerRefs.current[mode];
        return;
      }
      const marker = existing ?? new maplibregl.Marker({ color, draggable: true });
      marker.setLngLat([point.longitude, point.latitude]);
      if (!existing) {
        marker.on("dragend", () => {
          const coordinates = markerRefs.current[mode]?.getLngLat();
          if (coordinates) callbackRef.current(mode, coordinates.lat, coordinates.lng);
        });
        marker.addTo(map);
      }
      markerRefs.current[mode] = marker;
    });
    const line = map.getSource("route-line") as GeoJSONSource | undefined;
    if (line) {
      line.setData({
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: pickup && destination
            ? [[pickup.longitude, pickup.latitude], [destination.longitude, destination.latitude]]
            : [],
        },
      });
    }
    const locations = [pickup, destination].filter((point): point is GeocodingResult => Boolean(point));
    if (locations.length === 1) map.flyTo({ center: [locations[0].longitude, locations[0].latitude], zoom: 13 });
    if (locations.length === 2) {
      const bounds = new maplibregl.LngLatBounds();
      locations.forEach((point) => bounds.extend([point.longitude, point.latitude]));
      map.fitBounds(bounds, { padding: 70, maxZoom: 14 });
    }
  }, [pickup, destination]);

  return <div ref={containerRef} className="h-[420px] w-full overflow-hidden rounded-md border border-border" aria-label="Study route map" />;
}
