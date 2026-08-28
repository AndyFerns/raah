"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type { IssueWithMedia } from "./types";
import { STATUS_COLOR } from "./types";

/* ------------------------------------------------------------------ */
/* MapLibre GL types                                                   */
/* ------------------------------------------------------------------ */

declare global {
  interface Window {
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

// Individual markers disappear when zoomed out.
const MARKER_MIN_ZOOM = 13.5;

// Extra geographic area outside the viewport.
// Markers outside this padded area are hidden.
const BOUNDS_PADDING = 0.005;

// On a pitched 3D map, points near the top are visually close
// to the horizon. Hide them so they don't feel like floating UI.
const HORIZON_PADDING_TOP = 70;

// Also hide markers significantly outside the visible screen.
const SCREEN_PADDING = 100;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function getStatusColor(status: string): string {
  return STATUS_COLOR[status as keyof typeof STATUS_COLOR] ?? "#9ca3af";
}

function getMediaUrl(storagePath: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  if (storagePath.startsWith("http")) {
    return storagePath;
  }

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

    const dx =
      radiusMeters * Math.cos((angle * Math.PI) / 180);

    const dy =
      radiusMeters * Math.sin((angle * Math.PI) / 180);

    const newLat =
      lat +
      (dy / earthRadius) * (180 / Math.PI);

    const newLng =
      lng +
      (dx /
        (earthRadius *
          Math.cos((lat * Math.PI) / 180))) *
        (180 / Math.PI);

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
  
  const [isDark, setIsDark] = useState(true);

  const mapRef = useRef<any>(null);

  const markersRef = useRef<
    Map<
      string,
      {
        marker: any;
        element: HTMLDivElement;
        issue: IssueWithMedia;
      }
    >
  >(new Map());

  const onSelectRef = useRef(onSelectIssue);

  onSelectRef.current = onSelectIssue;

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

      script.src =
        "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js";

      script.onload = () => resolve();

      script.onerror = () =>
        reject(new Error("Failed to load MapLibre"));

      document.head.appendChild(script);
    });
  }, []);

  /* -------------------------------------------------------------- */
  /* Initialize map                                                  */
  /* -------------------------------------------------------------- */

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        await loadMapLibre();

        if (
          cancelled ||
          !containerRef.current ||
          !window.maplibregl
        ) {
          return;
        }

        const maplibregl = window.maplibregl;

        let center: [number, number] = DEFAULT_CENTER;

        if (issues.length > 0) {
          const avgLng =
            issues.reduce(
              (sum, issue) => sum + issue.longitude,
              0,
            ) / issues.length;

          const avgLat =
            issues.reduce(
              (sum, issue) => sum + issue.latitude,
              0,
            ) / issues.length;

          center = [avgLng, avgLat];
        }

        const mapStyle = `https://api.maptiler.com/maps/streets-v2${
          isDark ? "-dark" : ""
        }/style.json?key=${MAPTILER_KEY}`;

        const map = new maplibregl.Map({
          container: containerRef.current,

          style: mapStyle,

          center,

          zoom: DEFAULT_ZOOM,

          pitch: DEFAULT_PITCH,

          bearing: DEFAULT_BEARING,

          antialias: true,
        });

        map.addControl(
          new maplibregl.NavigationControl(),
          "top-right",
        );

        mapRef.current = map;

        map.on("load", () => {
          if (cancelled) return;

          /* -------------------------------------------------------- */
          /* Hotspot areas                                             */
          /* -------------------------------------------------------- */

          const hotspotFeatures = issues.map((issue) => ({
            type: "Feature" as const,

            properties: {
              id: issue.id,
              color: getStatusColor(issue.status),
            },

            geometry: {
              type: "Polygon" as const,

              coordinates: [
                createCircle(
                  issue.longitude,
                  issue.latitude,
                  150,
                ),
              ],
            },
          }));

          map.addSource("issue-hotspots", {
            type: "geojson",

            data: {
              type: "FeatureCollection",

              features: hotspotFeatures,
            },
          });

          map.addLayer({
            id: "issue-hotspots-glow",

            type: "fill",

            source: "issue-hotspots",

            minzoom: 11.5,

            paint: {
              "fill-color": ["get", "color"],

              "fill-opacity": 0.06,
            },
          });

          map.addLayer({
            id: "issue-hotspots-fill",

            type: "fill",

            source: "issue-hotspots",

            minzoom: 12.5,

            paint: {
              "fill-color": ["get", "color"],

              "fill-opacity": 0.14,
            },
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

          /* -------------------------------------------------------- */
          /* Issue markers                                             */
          /* -------------------------------------------------------- */

          const newMarkers = new Map<
            string,
            {
              marker: any;
              element: HTMLDivElement;
              issue: IssueWithMedia;
            }
          >();

          issues.forEach((issue) => {
            // Container for MapLibre positioning (NO CSS TRANSITIONS!)
            const containerEl = document.createElement("div");
            containerEl.className = "gov-marker-container";
            
            // Visual marker for hover/scale effects
            const el = document.createElement("div");
            el.className = "gov-marker";

            const color = getStatusColor(issue.status);
            el.style.borderColor = color;
            el.style.boxShadow = `0 4px 14px rgba(0,0,0,0.8), 0 0 16px ${color}55`;

            /* ---------------------------------------------------- */
            /* Issue image                                           */
            /* ---------------------------------------------------- */

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

            /* ---------------------------------------------------- */
            /* Status indicator                                      */
            /* ---------------------------------------------------- */

            const dot = document.createElement("div");
            dot.className = "gov-marker-dot";
            dot.style.background = color;
            dot.style.boxShadow = `0 0 6px ${color}`;
            el.appendChild(dot);

            containerEl.appendChild(el);

            /* ---------------------------------------------------- */
            /* Marker click                                          */
            /* ---------------------------------------------------- */

            containerEl.addEventListener("click", (event) => {
              event.stopPropagation();
              onSelectRef.current(issue);

              map.flyTo({
                center: [issue.longitude, issue.latitude],
                zoom: 16.5,
                pitch: 65,
                bearing: -20,
                duration: 1200,
                essential: true,
              });
            });

            /* ---------------------------------------------------- */
            /* IMPORTANT: REAL GEOGRAPHIC MARKER                     */
            /* ---------------------------------------------------- */

            const marker = new maplibregl.Marker({
              element: containerEl,
              anchor: "center",
            })
              .setLngLat([issue.longitude, issue.latitude])
              .addTo(map);

            newMarkers.set(issue.id, {
              marker,
              element: containerEl, // We toggle display on the container
              issue,
            });
          });

          markersRef.current =
            newMarkers;

          /* -------------------------------------------------------- */
          /* Marker visibility                                         */
          /* -------------------------------------------------------- */

          function updateMarkerVisibility() {
            const zoom =
              map.getZoom();

            const bounds =
              map.getBounds();

            const container =
              map.getContainer();

            const mapWidth =
              container.clientWidth;

            const mapHeight =
              container.clientHeight;

            newMarkers.forEach(
              ({
                element,
                issue,
              }) => {
                /* ------------------------------------------------ */
                /* 1. Zoom check                                    */
                /* ------------------------------------------------ */

                if (zoom < MARKER_MIN_ZOOM) {
                  element.style.display =
                    "none";

                  return;
                }

                /* ------------------------------------------------ */
                /* 2. Geographic bounds check                       */
                /* ------------------------------------------------ */

                const inBounds =
                  issue.latitude >=
                    bounds.getSouth() -
                      BOUNDS_PADDING &&
                  issue.latitude <=
                    bounds.getNorth() +
                      BOUNDS_PADDING &&
                  issue.longitude >=
                    bounds.getWest() -
                      BOUNDS_PADDING &&
                  issue.longitude <=
                    bounds.getEast() +
                      BOUNDS_PADDING;

                if (!inBounds) {
                  element.style.display =
                    "none";

                  return;
                }

                /* ------------------------------------------------ */
                /* 3. Screen projection check                       */
                /* ------------------------------------------------ */

                const point =
                  map.project([
                    issue.longitude,
                    issue.latitude,
                  ]);

                const isOutsideScreen =
                  point.x <
                    -SCREEN_PADDING ||
                  point.x >
                    mapWidth +
                      SCREEN_PADDING ||
                  point.y <
                    HORIZON_PADDING_TOP ||
                  point.y >
                    mapHeight +
                      SCREEN_PADDING;

                if (isOutsideScreen) {
                  element.style.display =
                    "none";

                  return;
                }

                /* ------------------------------------------------ */
                /* Marker is geographically visible                  */
                /* ------------------------------------------------ */

                element.style.display =
                  "block";
              },
            );
          }

          /*
           * Run continuously while the map is moving.
           *
           * This is important:
           * markers disappear immediately while panning,
           * instead of remaining visible until moveend.
           */

          map.on(
            "move",
            updateMarkerVisibility,
          );

          map.on(
            "zoom",
            updateMarkerVisibility,
          );

          map.on(
            "rotate",
            updateMarkerVisibility,
          );

          map.on(
            "pitch",
            updateMarkerVisibility,
          );

          map.on(
            "resize",
            updateMarkerVisibility,
          );

          updateMarkerVisibility();
        });
      } catch (error) {
        console.error(
          "Failed to initialize map:",
          error,
        );
      }
    }

    init();

    return () => {
      cancelled = true;

      markersRef.current.forEach(
        ({ marker }) => {
          marker.remove();
        },
      );

      markersRef.current.clear();

      if (mapRef.current) {
        mapRef.current.remove();

        mapRef.current = null;
      }
    };
  }, [issues, loadMapLibre, isDark]);

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
    <div className="gov-map-wrapper">
      <div
        ref={containerRef}
        className="gov-map-container"
      />
      
      <button 
        className="gov-theme-toggle"
        onClick={() => setIsDark(!isDark)}
        title="Toggle Map Theme"
      >
        {isDark ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
        )}
      </button>

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

        .gov-theme-toggle {
          position: absolute;
          top: 110px;
          right: 10px;
          width: 30px;
          height: 30px;
          border-radius: 6px;
          background: ${isDark ? 'rgba(17, 24, 39, 0.9)' : 'rgba(255, 255, 255, 0.9)'};
          border: 1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};
          color: ${isDark ? '#e2e8f0' : '#1e293b'};
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 10;
          box-shadow: 0 0 0 2px rgba(0,0,0,0.1);
        }
        
        .gov-theme-toggle:hover {
          background: ${isDark ? 'rgba(31, 41, 55, 0.95)' : 'rgba(241, 245, 249, 0.95)'};
        }

        /* -------------------------------------------------------- */
        /* Issue marker                                               */
        /* -------------------------------------------------------- */

        .gov-marker-container {
          display: block;
          /* NO CSS TRANSITIONS HERE! This is what MapLibre moves. */
        }

        .gov-marker {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          overflow: hidden;
          background: #111827;
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
          background: #1a1f2e;
        }

        .gov-marker-dot {
          position: absolute;
          bottom: -1px;
          right: -1px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid #111827;
          pointer-events: none;
        }

        /* -------------------------------------------------------- */
        /* MapLibre controls                                          */
        /* -------------------------------------------------------- */

        .maplibregl-ctrl-group {
          background:
            rgba(17, 24, 39, 0.9)
            !important;

          border:
            1px solid
            rgba(255,255,255,0.1)
            !important;

          border-radius:
            6px
            !important;

          backdrop-filter:
            blur(8px);
        }

        .maplibregl-ctrl-group button {
          background:
            transparent
            !important;

          border-bottom-color:
            rgba(255,255,255,0.08)
            !important;
        }

        .maplibregl-ctrl-group button span {
          filter:
            invert(1)
            brightness(0.8);
        }

        .maplibregl-ctrl-attrib {
          background:
            rgba(17, 24, 39, 0.7)
            !important;

          color:
            rgba(255,255,255,0.4)
            !important;

          font-size:
            10px
            !important;
        }

        .maplibregl-ctrl-attrib a {
          color:
            rgba(255,255,255,0.5)
            !important;
        }
      `}</style>
    </div>
  );
}