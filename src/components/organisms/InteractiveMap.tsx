"use client";

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { provinces } from "@/data/provinces";
import type { FeatureCollection, Feature, Geometry } from "geojson";
import "leaflet/dist/leaflet.css";

let districtsGeoCache: FeatureCollection | null = null;
let provincesGeoCache: FeatureCollection | null = null;
let geoLoadPromise: Promise<{ districts: FeatureCollection; provinces: FeatureCollection | null }> | null = null;
const DEFAULT_FIT_PADDING: [number, number] = [12, 12];

/* ── Province colors (same palette as the rest of the app) ── */
const PROVINCE_COLORS: Record<number, string> = {
  1: "#e5b6ac", 2: "#95cbdd", 3: "#b2d8a6", 4: "#f2a55a",
  5: "#f4c2f1", 6: "#ffe380", 7: "#bcc0e7",
};
const PROVINCE_HOVER: Record<number, string> = {
  1: "#d49385", 2: "#6db5d1", 3: "#8ec97e", 4: "#e78d2f",
  5: "#ea9ce6", 6: "#ffda4d", 7: "#9da2d8",
};

interface DistrictProperties {
  districtId: number;
  name: string;
  slug: string;
  provinceId: number;
  constituencies: number;
}

interface ProvinceProperties {
  id: number;
  name: string;
}

interface InteractiveMapProps {
  /** If set, only show districts for this province */
  provinceId?: number;
  /** Callback when a district is clicked — receives districtId */
  onDistrictClick?: (districtId: number, districtName: string, constituencies: number, provinceId: number) => void;
  /** Callback when a province is clicked (for full Nepal map view) */
  onProvinceClick?: (provinceId: number) => void;
  /** Height of the map container */
  height?: number | string;
  /** Show province boundaries as an overlay */
  showProvinceBorders?: boolean;
  /** Highlight a specific district (selected state) */
  selectedDistrictId?: number | null;
  /** Show permanent name labels on districts (useful for province view) */
  showLabels?: boolean;
  /** Enable district intensity heatmap mode */
  showHeatmap?: boolean;
  /** Optional district metric map for heatmap mode */
  districtValueMap?: Record<number, number>;
  /** Max zoom to use when fitting bounds */
  fitMaxZoom?: number;
  /** Padding for fit bounds */
  fitPadding?: [number, number];
}

function heatColor(value: number, maxValue: number): string {
  if (maxValue <= 0) return "#dbeafe";
  const t = Math.max(0, Math.min(1, value / maxValue));
  if (t < 0.2) return "#dbeafe";
  if (t < 0.4) return "#93c5fd";
  if (t < 0.6) return "#60a5fa";
  if (t < 0.8) return "#3b82f6";
  return "#1d4ed8";
}

async function loadGeoData(includeProvinces: boolean) {
  if (districtsGeoCache && (!includeProvinces || provincesGeoCache)) {
    return { districts: districtsGeoCache, provinces: includeProvinces ? provincesGeoCache : null };
  }

  if (!geoLoadPromise) {
    geoLoadPromise = (async () => {
      const [distRes, provRes] = await Promise.all([
        fetch("/assets/geo/nepal-districts.json"),
        fetch("/assets/geo/nepal-provinces.json"),
      ]);
      const districts = (await distRes.json()) as FeatureCollection;
      const provinces = (await provRes.json()) as FeatureCollection;
      districtsGeoCache = districts;
      provincesGeoCache = provinces;
      return { districts, provinces };
    })().finally(() => {
      geoLoadPromise = null;
    });
  }

  const loaded = await geoLoadPromise;
  return { districts: loaded.districts, provinces: includeProvinces ? loaded.provinces : null };
}

export default function InteractiveMap({
  provinceId,
  onDistrictClick,
  onProvinceClick,
  height = 420,
  showProvinceBorders = true,
  selectedDistrictId = null,
  showLabels = false,
  showHeatmap = false,
  districtValueMap = {},
  fitMaxZoom,
  fitPadding,
}: InteractiveMapProps) {
  const router = useRouter();
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const geoLayerRef = useRef<L.GeoJSON | null>(null);
  const provLayerRef = useRef<L.GeoJSON | null>(null);
  const labelsRef = useRef<L.LayerGroup | null>(null);
  const filteredDistrictsRef = useRef<FeatureCollection | null>(null);
  const onDistrictClickRef = useRef(onDistrictClick);
  const onProvinceClickRef = useRef(onProvinceClick);
  const selectedDistrictRef = useRef<number | null>(selectedDistrictId);
  const districtValueMapRef = useRef<Record<number, number>>(districtValueMap);
  const showHeatmapRef = useRef(showHeatmap);
  const [loading, setLoading] = useState(true);
  const [L, setL] = useState<typeof import("leaflet") | null>(null);
  const resolvedPadding = fitPadding ?? DEFAULT_FIT_PADDING;

  useEffect(() => {
    onDistrictClickRef.current = onDistrictClick;
    onProvinceClickRef.current = onProvinceClick;
    selectedDistrictRef.current = selectedDistrictId;
    districtValueMapRef.current = districtValueMap;
    showHeatmapRef.current = showHeatmap;
  }, [onDistrictClick, onProvinceClick, selectedDistrictId, districtValueMap, showHeatmap]);

  // Build district lookup from provinces data
  const districtLookup = useMemo(() => {
    const map: Record<number, { name: string; provinceId: number; provinceName: string; slug: string; constituencies: number }> = {};
    for (const p of provinces) {
      for (const d of p.districts) {
        map[d.districtId] = { name: d.name, provinceId: p.id, provinceName: p.name, slug: d.slug, constituencies: d.constituencies };
      }
    }
    return map;
  }, []);

  // Load Leaflet dynamically (client-only)
  useEffect(() => {
    import("leaflet").then((leaflet) => {
      setL(leaflet.default || leaflet);
    });
  }, []);

  // Initialize map once Leaflet is loaded
  useEffect(() => {
    if (!L || !containerRef.current) return;
    if (mapRef.current) return; // already initialized

    const map = L.map(containerRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
      attributionControl: false,
      minZoom: 6,
      maxZoom: 14,
    });

    // Light tile layer
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [L]);

  // Load GeoJSON data and render layers
  useEffect(() => {
    if (!L || !mapRef.current) return;
    const map = mapRef.current;

    // Remove existing layers
    if (geoLayerRef.current) {
      map.removeLayer(geoLayerRef.current);
      geoLayerRef.current = null;
    }
    if (provLayerRef.current) {
      map.removeLayer(provLayerRef.current);
      provLayerRef.current = null;
    }

    setLoading(true);

    const loadData = async () => {
      try {
        const loaded = await loadGeoData(showProvinceBorders);
        const distData: FeatureCollection = loaded.districts;
        const provData: FeatureCollection | null = loaded.provinces;

        // Filter districts if provinceId specified
        const filteredDistricts: FeatureCollection = provinceId
          ? {
              type: "FeatureCollection",
              features: distData.features.filter(
                (f) => (f.properties as DistrictProperties).provinceId === provinceId
              ),
            }
          : distData;

        filteredDistrictsRef.current = filteredDistricts;

        // District layer
        const maxHeatValue = Math.max(
          0,
          ...filteredDistricts.features.map((f) => districtValueMapRef.current[(f.properties as DistrictProperties).districtId] || 0)
        );

        const distLayer = L.geoJSON(filteredDistricts, {
          style: (feature) => {
            const props = feature?.properties as DistrictProperties;
            const color = PROVINCE_COLORS[props.provinceId] || "#94a3b8";
            const isSelected = selectedDistrictRef.current === props.districtId;
            const districtMetric = districtValueMapRef.current[props.districtId] || 0;
            const fillColor = showHeatmapRef.current
              ? heatColor(districtMetric, maxHeatValue)
              : (isSelected ? PROVINCE_HOVER[props.provinceId] || "#64748b" : color);
            return {
              fillColor,
              fillOpacity: isSelected ? 0.9 : (showHeatmapRef.current ? 0.75 : 0.6),
              color: isSelected ? "#1e293b" : "#fff",
              weight: isSelected ? 3 : 1.5,
              opacity: 0.9,
            };
          },
          onEachFeature: (feature, layer) => {
            const props = feature.properties as DistrictProperties;
            const info = districtLookup[props.districtId];

            // Tooltip
            const tooltipContent = `
              <div style="font-family: system-ui; padding: 2px 0;">
                <div style="font-weight: 700; font-size: 13px; color: #1e293b;">${props.name}</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                  ${info?.provinceName || ""} · ${props.constituencies} ${props.constituencies === 1 ? "constituency" : "constituencies"}
                </div>
                ${showHeatmapRef.current ? `<div style="font-size: 11px; color: #334155; margin-top: 2px; font-weight: 600;">Votes: ${(districtValueMapRef.current[props.districtId] || 0).toLocaleString()}</div>` : ""}
              </div>
            `;
            layer.bindTooltip(tooltipContent, {
              sticky: true,
              direction: "top",
              offset: [0, -10],
              className: "map-tooltip",
            });

            // Hover effects
            layer.on("mouseover", () => {
              const hoverColor = PROVINCE_HOVER[props.provinceId] || "#64748b";
              (layer as L.Path).setStyle({
                fillColor: hoverColor,
                fillOpacity: 0.85,
                weight: 2.5,
                color: "#374151",
              });
              (layer as L.Path).bringToFront();
            });

            layer.on("mouseout", () => {
              distLayer.resetStyle(layer);
            });

            // Click
            layer.on("click", () => {
              if (onDistrictClickRef.current) {
                onDistrictClickRef.current?.(props.districtId, props.name, props.constituencies, props.provinceId);
              } else if (onProvinceClickRef.current) {
                onProvinceClickRef.current(props.provinceId);
              } else {
                // Default: navigate to province page
                router.push(`/provinces/${props.provinceId}`);
              }
            });
          },
        });

        distLayer.addTo(map);
        geoLayerRef.current = distLayer;

        // Permanent district name labels (province view)
        if (showLabels && provinceId && labelsRef.current) {
          map.removeLayer(labelsRef.current);
          labelsRef.current = null;
        }
        if (showLabels && provinceId) {
          const labelGroup = L.layerGroup();
          filteredDistricts.features.forEach((f) => {
            const props = f.properties as DistrictProperties;
            const bounds = L.geoJSON(f as never).getBounds();
            const center = bounds.getCenter();
            const isSelected = selectedDistrictRef.current === props.districtId;
            const icon = L.divIcon({
              className: "district-label",
              html: `<div class="district-label-inner ${isSelected ? "selected" : ""}">
                <span class="district-name">${props.name}</span>
                <span class="district-seats">${props.constituencies} seat${props.constituencies > 1 ? "s" : ""}</span>
              </div>`,
              iconSize: [0, 0],
              iconAnchor: [0, 0],
            });
            L.marker(center, { icon, interactive: false }).addTo(labelGroup);
          });
          labelGroup.addTo(map);
          labelsRef.current = labelGroup;
        }

        // Province borders overlay
        if (provData && showProvinceBorders && !provinceId) {
          const provLayer = L.geoJSON(provData, {
            style: {
              fillColor: "transparent",
              fillOpacity: 0,
              color: "#374151",
              weight: 2.5,
              opacity: 0.7,
              dashArray: "6,3",
            },
            interactive: !!onProvinceClickRef.current,
            onEachFeature: (feature, layer) => {
              if (!onProvinceClickRef.current) return;
              const props = feature.properties as ProvinceProperties;
              layer.bindTooltip(props.name, {
                sticky: true,
                direction: "top",
                offset: [0, -10],
                className: "map-tooltip",
              });
              layer.on("click", () => onProvinceClickRef.current?.(props.id));
            },
          });
          provLayer.addTo(map);
          provLayerRef.current = provLayer;
        }

        // Fit bounds
        const bounds = distLayer.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, {
            padding: resolvedPadding,
            maxZoom: fitMaxZoom ?? (provinceId ? 10 : 8),
          });
        }
      } catch (err) {
        console.error("Failed to load map data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [L, provinceId, showProvinceBorders, router, districtLookup, showLabels, fitMaxZoom, resolvedPadding[0], resolvedPadding[1]]);

  // Lightweight style refresh without rebuilding layers
  useEffect(() => {
    if (!L || !geoLayerRef.current || !filteredDistrictsRef.current) return;

    const layer = geoLayerRef.current;
    const features = filteredDistrictsRef.current.features;
    const maxHeatValue = Math.max(
      0,
      ...features.map((f) => districtValueMap[(f.properties as DistrictProperties).districtId] || 0)
    );

    layer.eachLayer((l) => {
      const path = l as L.Path & { feature?: Feature<Geometry, DistrictProperties> };
      const props = path.feature?.properties;
      if (!props) return;
      const isSelected = selectedDistrictId === props.districtId;
      const base = PROVINCE_COLORS[props.provinceId] || "#94a3b8";
      const metric = districtValueMap[props.districtId] || 0;
      const fillColor = showHeatmap ? heatColor(metric, maxHeatValue) : (isSelected ? PROVINCE_HOVER[props.provinceId] || "#64748b" : base);
      path.setStyle({
        fillColor,
        fillOpacity: isSelected ? 0.9 : (showHeatmap ? 0.75 : 0.6),
        color: isSelected ? "#1e293b" : "#fff",
        weight: isSelected ? 3 : 1.5,
        opacity: 0.9,
      });
    });
  }, [L, selectedDistrictId, showHeatmap, districtValueMap]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
      <style>{`
        .map-tooltip {
          background: white !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 8px !important;
          padding: 8px 12px !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
          font-size: 12px !important;
        }
        .map-tooltip::before { display: none !important; }
        .leaflet-control-zoom { border: 1px solid #e2e8f0 !important; border-radius: 8px !important; overflow: hidden; }
        .leaflet-control-zoom a { color: #475569 !important; width: 30px !important; height: 30px !important; line-height: 30px !important; font-size: 14px !important; }
        .leaflet-control-zoom a:hover { background: #f1f5f9 !important; }
        .district-label { pointer-events: none !important; }
        .district-label-inner {
          transform: translate(-50%, -50%);
          display: flex; flex-direction: column; align-items: center; gap: 1px;
          white-space: nowrap;
          text-shadow: 0 0 4px rgba(255,255,255,0.95), 0 0 2px rgba(255,255,255,0.9);
          transition: all 0.2s;
        }
        .district-label-inner .district-name {
          font-size: 10px; font-weight: 700; color: #334155;
          line-height: 1.1;
        }
        .district-label-inner .district-seats {
          font-size: 8px; font-weight: 500; color: #64748b;
          line-height: 1;
        }
        .district-label-inner.selected .district-name {
          font-size: 11px; color: #0f172a;
        }
        .district-label-inner.selected .district-seats {
          font-size: 9px; color: #334155; font-weight: 600;
        }
      `}</style>

      {loading && (
        <div
          className="absolute inset-0 z-[1000] flex items-center justify-center bg-slate-50/80 backdrop-blur-sm"
        >
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
            <span className="text-xs text-slate-400">Loading map...</span>
          </div>
        </div>
      )}

      <div ref={containerRef} style={{ height, width: "100%", zIndex: 1 }} />
    </div>
  );
}
