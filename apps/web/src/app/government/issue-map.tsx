"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type { IssueWithMedia } from "./types";
import { STATUS_COLOR } from "./types";

/* ------------------------------------------------------------------ */
/* MapLibre GL types                                                   */
/* ------------------------------------------------------------------ */

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    maplibregl: any;
  }
}

const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_API_KEY ?? "";

const DEFAULT_CENTER: [number, number] = [72.9986, 19.155];

const DEFAULT_ZOOM = 14;
const DEFAULT_PITCH = 60;
const DEFAULT_BEARING = -20;

/* ------------------------------------------------------------------ */
/* Marker visibility configuration                                    */
/* ------------------------------------------------------------------ */

const MARKER_MIN_ZOOM = 13.5;
const BOUNDS_PADDING = 0.005;
const HORIZON_PADDING_TOP = 70;
const SCREEN_PADDING = 100;

/* ------------------------------------------------------------------ */
/* MapTiler styles used for RAAH's light/dark themes.                 */
/* We pick from the same "streets-v2" family so the vector detail,   */
/* labels, and cartography stay consistent across theme switches.    */
/* ------------------------------------------------------------------ */

function styleUrlForTheme(theme: "light" | "dark"): string {
  const base =
    theme === "dark"
      ? "https://api.maptiler.com/maps/streets-v2-dark/style.json"
      : "https://api.maptiler.com/maps/streets-v2/style.json";
  return `${base}?key=${MAPTILER_KEY}`;
}

/* ------------------------------------------------------------------ */
/* Read the current RAAH theme from the html[data-theme] attribute.  */
/* This is written by the pre-hydration ThemeScript and updated by   */
/* the global ThemeToggle, so we never own theme state ourselves.    */
/* ------------------------------------------------------------------ */

function readTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "light";
  const attr = document.documentElement.dataset.theme;
  return attr === "dark" ? "dark" : "light";
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function getStatusColor(status: string): string {
  return STATUS_COLOR[status as keyof typeof STATUS_COLOR] ?? "#9ca3af";
}

function getMediaUrl(storagePath: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (storagePath.startsWith("http")) return storagePath;
  return `${supabaseUrl}/storage/v1/object/public/issue-media/${storagePath}`;
}

function createCircle(
  lng: number,
  lat: number,
  radiusMeters: number,
  points = 64,
): [number, number][] {
  const coords: [number, number][] = [];
  const earthRadius = 6371000;
  for (let i = 0; i < points; i++) {
    const angle = (i * 360) / points;
    const dx = radiusMeters * Math.cos((angle * Math.PI) / 180);
    const dy = radiusMeters * Math.sin((angle * Math.PI) / 180);
    const newLat = lat + (dy / earthRadius) * (180 / Math.PI);
    const newLng =
      lng +
      (dx / (earthRadius * Math.cos((lat * Math.PI) / 180))) * (180 / Math.PI);
    coords.push([newLng, newLat]);
  }
  coords.push(coords[0]);
  return coords;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function IssueMap({
  issues,
  selectedIssueId,
  onSelectIssue,
}: {
  issues: IssueWithMedia[];
  selectedIssueId: string | null;
  onSelectIssue: (issue: IssueWithMedia) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Theme is derived from html[data-theme]; we mirror it into state only so
  // the effect can re-run when the global toggle fires.
  const [theme, setTheme] = useState<"light" | "dark">(readTheme);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);

  const markersRef = useRef<
    Map<
      string,
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        marker: any;
        element: HTMLDivElement;
        issue: IssueWithMedia;
      }
    >
  >(new Map());

  const onSelectRef = useRef(onSelectIssue);
  onSelectRef.current = onSelectIssue;

  // Keep an up-to-date list of issues for the deferred style.load handler
  // (which fires after setStyle wipes sources/layers on theme change).
  const issuesRef = useRef(issues);
  issuesRef.current = issues;

  /* -------------------------------------------------------------- */
  /* Observe html[data-theme] so the map follows the global toggle   */
  /* -------------------------------------------------------------- */

  useEffect(() => {
    if (typeof MutationObserver === "undefined") return;
    const target = document.documentElement;
    const observer = new MutationObserver(() => {
      setTheme((prev) => {
        const next = readTheme();
        return next === prev ? prev : next;
      });
    });
    observer.observe(target, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  /* -------------------------------------------------------------- */
  /* Load MapLibre                                                   */
  /* -------------------------------------------------------------- */

  const loadMapLibre = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.maplibregl) {
        resolve();
        return;
      }
      const existingScript = document.querySelector(
        'script[src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"]',
      );
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve());
        return;
      }
      const existingCss = document.querySelector(
        'link[href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css"]',
      );
      if (!existingCss) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href =
          "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css";
        document.head.appendChild(link);
      }
      const script = document.createElement("script");
      script.src = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load MapLibre"));
      document.head.appendChild(script);
    });
  }, []);

  /* -------------------------------------------------------------- */
  /* Add hotspot source + layers (idempotent — safe on style reload) */
  /* -------------------------------------------------------------- */

  const applyHotspots = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (map: any, list: IssueWithMedia[]) => {
      const hotspotFeatures = list.map((issue) => ({
        type: "Feature" as const,
        properties: {
          id: issue.id,
          color: getStatusColor(issue.status),
        },
        geometry: {
          type: "Polygon" as const,
          coordinates: [createCircle(issue.longitude, issue.latitude, 150)],
        },
      }));

      const existing = map.getSource("issue-hotspots");
      if (existing) {
        existing.setData({
          type: "FeatureCollection",
          features: hotspotFeatures,
        });
        return;
      }

      map.addSource("issue-hotspots", {
        type: "geojson",
        data: { type: "FeatureCollection", features: hotspotFeatures },
      });

      map.addLayer({
        id: "issue-hotspots-glow",
        type: "fill",
        source: "issue-hotspots",
        minzoom: 11.5,
        paint: { "fill-color": ["get", "color"], "fill-opacity": 0.06 },
      });
      map.addLayer({
        id: "issue-hotspots-fill",
        type: "fill",
        source: "issue-hotspots",
        minzoom: 12.5,
        paint: { "fill-color": ["get", "color"], "fill-opacity": 0.14 },
      });
      map.addLayer({
        id: "issue-hotspots-border",
        type: "line",
        source: "issue-hotspots",
        minzoom: 12.5,
        paint: {
          "line-color": ["get", "color"],
          "line-width": 1.5,
          "line-opacity": 0.55,
          "line-blur": 1,
        },
      });
    },
    [],
  );

  /* -------------------------------------------------------------- */
  /* Initialize map (created once, then only issues/theme drive it)  */
  /* -------------------------------------------------------------- */

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        await loadMapLibre();
        if (cancelled || !containerRef.current || !window.maplibregl) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const maplibregl = window.maplibregl;

        let center: [number, number] = DEFAULT_CENTER;
        if (issuesRef.current.length > 0) {
          const list = issuesRef.current;
          const avgLng =
            list.reduce((sum, i) => sum + i.longitude, 0) / list.length;
          const avgLat =
            list.reduce((sum, i) => sum + i.latitude, 0) / list.length;
          center = [avgLng, avgLat];
        }

        const map = new maplibregl.Map({
          container: containerRef.current,
          style: styleUrlForTheme(readTheme()),
          center,
          zoom: DEFAULT_ZOOM,
          pitch: DEFAULT_PITCH,
          bearing: DEFAULT_BEARING,
          antialias: true,
        });

        map.addControl(new maplibregl.NavigationControl(), "top-right");
        mapRef.current = map;

        map.on("load", () => {
          if (cancelled) return;
          applyHotspots(map, issuesRef.current);
          buildMarkers(map, issuesRef.current);
        });

        // After setStyle() the base style layers are replaced, so we re-add
        // our custom layers/sources. HTML markers survive automatically.
        map.on("style.load", () => {
          if (cancelled) return;
          applyHotspots(map, issuesRef.current);
        });

        function buildMarkers(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          m: any,
          list: IssueWithMedia[],
        ) {
          // Wipe any previously-attached markers before rebuilding.
          markersRef.current.forEach(({ marker }) => marker.remove());
          markersRef.current.clear();

          const newMarkers = new Map<
            string,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { marker: any; element: HTMLDivElement; issue: IssueWithMedia }
          >();

          list.forEach((issue) => {
            const containerEl = document.createElement("div");
            containerEl.className = "gov-marker-container";

            const el = document.createElement("div");
            el.className = "gov-marker";

            const color = getStatusColor(issue.status);
            el.style.borderColor = color;
            el.style.boxShadow = `0 4px 14px rgba(0,0,0,0.6), 0 0 16px ${color}55`;

            const firstImage = issue.issue_media?.find(
              (media) => media.type === "image",
            );

            if (firstImage) {
              const image = document.createElement("img");
              image.src = getMediaUrl(firstImage.storage_path);
              image.alt = issue.title;
              image.draggable = false;
              image.onerror = () => {
                el.innerHTML = `
                  <div class="gov-marker-placeholder" style="color:${color}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                  </div>`;
                const errorDot = document.createElement("div");
                errorDot.className = "gov-marker-dot";
                errorDot.style.background = color;
                el.appendChild(errorDot);
              };
              el.appendChild(image);
            } else {
              el.innerHTML = `
                <div class="gov-marker-placeholder" style="color:${color}">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                </div>`;
            }

            const dot = document.createElement("div");
            dot.className = "gov-marker-dot";
            dot.style.background = color;
            dot.style.boxShadow = `0 0 6px ${color}`;
            el.appendChild(dot);

            containerEl.appendChild(el);

            containerEl.addEventListener("click", (event) => {
              event.stopPropagation();
              onSelectRef.current(issue);
              m.flyTo({
                center: [issue.longitude, issue.latitude],
                zoom: 16.5,
                pitch: 65,
                bearing: -20,
                duration: 1200,
                essential: true,
              });
            });

            const marker = new maplibregl.Marker({
              element: containerEl,
              anchor: "center",
            })
              .setLngLat([issue.longitude, issue.latitude])
              .addTo(m);

            newMarkers.set(issue.id, { marker, element: containerEl, issue });
          });

          markersRef.current = newMarkers;

          function updateMarkerVisibility() {
            const zoom = m.getZoom();
            const bounds = m.getBounds();
            const container = m.getContainer();
            const mapWidth = container.clientWidth;
            const mapHeight = container.clientHeight;

            newMarkers.forEach(({ element, issue }) => {
              if (zoom < MARKER_MIN_ZOOM) {
                element.style.display = "none";
                return;
              }
              const inBounds =
                issue.latitude >= bounds.getSouth() - BOUNDS_PADDING &&
                issue.latitude <= bounds.getNorth() + BOUNDS_PADDING &&
                issue.longitude >= bounds.getWest() - BOUNDS_PADDING &&
                issue.longitude <= bounds.getEast() + BOUNDS_PADDING;
              if (!inBounds) {
                element.style.display = "none";
                return;
              }
              const point = m.project([issue.longitude, issue.latitude]);
              const isOutsideScreen =
                point.x < -SCREEN_PADDING ||
                point.x > mapWidth + SCREEN_PADDING ||
                point.y < HORIZON_PADDING_TOP ||
                point.y > mapHeight + SCREEN_PADDING;
              if (isOutsideScreen) {
                element.style.display = "none";
                return;
              }
              element.style.display = "block";
            });
          }

          m.on("move", updateMarkerVisibility);
          m.on("zoom", updateMarkerVisibility);
          m.on("rotate", updateMarkerVisibility);
          m.on("pitch", updateMarkerVisibility);
          m.on("resize", updateMarkerVisibility);
          updateMarkerVisibility();
        }
      } catch (error) {
        console.error("Failed to initialize map:", error);
      }
    }

    init();

    return () => {
      cancelled = true;
      markersRef.current.forEach(({ marker }) => marker.remove());
      markersRef.current.clear();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // Only depends on the loader; the map re-hydrates issues & theme via
    // refs and dedicated effects below.
  }, [loadMapLibre, applyHotspots]);

  /* -------------------------------------------------------------- */
  /* Theme change → setStyle without recreating the map              */
  /* -------------------------------------------------------------- */

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    // setStyle replaces basemap layers; our style.load handler re-adds
    // hotspot source/layers. HTML markers persist automatically.
    map.setStyle(styleUrlForTheme(theme));
  }, [theme]);

  /* -------------------------------------------------------------- */
  /* Issues change → refresh hotspots + markers                      */
  /* -------------------------------------------------------------- */

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (map.isStyleLoaded && map.isStyleLoaded()) {
      applyHotspots(map, issues);
    }

    // Update marker colors/data by matching id; skip full rebuild.
    markersRef.current.forEach(({ element, issue }, id) => {
      const updated = issues.find((i) => i.id === id);
      if (!updated) return;
      // Just update color-driven visuals; positions rarely change.
      const inner = element.querySelector<HTMLDivElement>(".gov-marker");
      if (inner) {
        const color = getStatusColor(updated.status);
        inner.style.borderColor = color;
        inner.style.boxShadow = `0 4px 14px rgba(0,0,0,0.6), 0 0 16px ${color}55`;
        const dot = inner.querySelector<HTMLDivElement>(".gov-marker-dot");
        if (dot) {
          dot.style.background = color;
          dot.style.boxShadow = `0 0 6px ${color}`;
        }
      }
      // Keep our ref value in sync too.
      Object.assign(issue, updated);
    });
  }, [issues, applyHotspots]);

  /* -------------------------------------------------------------- */
  /* Selected marker highlight                                       */
  /* -------------------------------------------------------------- */

  useEffect(() => {
    markersRef.current.forEach(({ element }, id) => {
      if (id === selectedIssueId) {
        element.classList.add("gov-marker-container--selected");
      } else {
        element.classList.remove("gov-marker-container--selected");
      }
    });
  }, [selectedIssueId]);

  return (
    <div className="gov-map-wrapper" data-map-theme={theme}>
      <div ref={containerRef} className="gov-map-container" />

      <style>{`
        .gov-map-wrapper {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .gov-map-container {
          width: 100%;
          height: 100%;
        }

        /* -------------------------------------------------------- */
        /* Issue marker                                               */
        /* -------------------------------------------------------- */

        .gov-marker-container {
          display: block;
        }

        .gov-marker {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          overflow: hidden;
          background: var(--surface, #111827);
          border: 4px solid;
          cursor: pointer;
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
          position: relative;
          will-change: transform;
          user-select: none;
        }

        .gov-marker-container:hover .gov-marker {
          transform: scale(1.15);
        }

        .gov-marker-container--selected {
          z-index: 20 !important;
        }

        .gov-marker-container--selected .gov-marker {
          transform: scale(1.22) !important;
          border-width: 3px;
          box-shadow:
            0 0 0 4px rgba(255,255,255,0.25),
            0 4px 20px rgba(0,0,0,0.9) !important;
        }

        .gov-marker img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          pointer-events: none;
        }

        .gov-marker-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--surface-inset, #1a1f2e);
        }

        .gov-marker-dot {
          position: absolute;
          bottom: -1px;
          right: -1px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid var(--surface, #111827);
          pointer-events: none;
        }

        /* -------------------------------------------------------- */
        /* MapLibre controls — themed via the RAAH tokens             */
        /* -------------------------------------------------------- */

        .maplibregl-ctrl-group {
          background: var(--surface) !important;
          border: 1px solid var(--border) !important;
          border-radius: 8px !important;
          backdrop-filter: blur(8px);
        }

        .maplibregl-ctrl-group button {
          background: transparent !important;
          border-bottom-color: var(--border) !important;
        }

        [data-map-theme="dark"] .maplibregl-ctrl-group button span {
          filter: invert(1) brightness(0.9);
        }

        .maplibregl-ctrl-attrib {
          background: color-mix(in srgb, var(--surface) 80%, transparent) !important;
          color: var(--muted) !important;
          font-size: 10px !important;
        }

        .maplibregl-ctrl-attrib a {
          color: var(--muted) !important;
        }
      `}</style>
    </div>
  );
}
