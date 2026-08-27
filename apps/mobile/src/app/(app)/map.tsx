import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
} from "react-native";
import * as Location from "expo-location";
import { WebView } from "react-native-webview";

import { supabase } from "@/lib/supabase";

const MAPTILER_KEY = process.env.EXPO_PUBLIC_MAPTILER_API_KEY;

type AppLocation = {
  latitude: number;
  longitude: number;
};

type Issue = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  latitude: number;
  longitude: number;
  support_count: number;
  created_at: string;
  image: string | null;
};

export default function MapScreen() {
  const [location, setLocation] =
    useState<AppLocation | null>(null);

  const [issues, setIssues] =
    useState<Issue[]>([]);

  const [loading, setLoading] =
    useState(true);

  /*
    =========================
    GET USER LOCATION
    =========================
  */

  useEffect(() => {
    async function getLocation() {
      try {
        const { status } =
          await Location.requestForegroundPermissionsAsync();

        if (status !== "granted") {
          console.log("Location permission denied");

          // Airoli fallback
          setLocation({
            latitude: 19.155,
            longitude: 72.9986,
          });

          return;
        }

        const currentLocation =
          await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });

        setLocation({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        });
      } catch (error) {
        console.log("Location error:", error);

        // Airoli fallback
        setLocation({
          latitude: 19.155,
          longitude: 72.9986,
        });
      }
    }

    getLocation();
  }, []);

  /*
    =========================
    FETCH ISSUES
    =========================
  */

  useEffect(() => {
    async function fetchIssues() {
      try {
        const { data, error } = await supabase
          .from("issues")
          .select(`
            id,
            title,
            description,
            category,
            status,
            latitude,
            longitude,
            support_count,
            created_at,
            issue_media (
              storage_path,
              type
            )
          `)
          .order("created_at", {
            ascending: false,
          });

        if (error) {
          console.log(
            "Issue fetch error:",
            error
          );

          return;
        }

        const formattedIssues: Issue[] =
          (data || []).map((issue: any) => {
            const media =
              issue.issue_media?.find(
                (item: any) =>
                  item.type === "image"
              ) ||
              issue.issue_media?.[0];

            return {
              id: issue.id,
              title: issue.title,
              description:
                issue.description,
              category: issue.category,
              status: issue.status,
              latitude: issue.latitude,
              longitude: issue.longitude,
              support_count:
                issue.support_count || 0,
              created_at:
                issue.created_at,

              image:
                media?.storage_path || null,
            };
          });

        console.log(
          "Fetched issues:",
          formattedIssues
        );

        setIssues(formattedIssues);
      } catch (error) {
        console.log(
          "Unexpected issue fetch error:",
          error
        );
      } finally {
        setLoading(false);
      }
    }

    fetchIssues();
  }, []);

  /*
    =========================
    LOADING SCREEN
    =========================
  */

  if (!location || loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator
          size="large"
          color="#22c55e"
        />

        <Text style={styles.loadingText}>
          Loading map...
        </Text>
      </View>
    );
  }

  /*
    =========================
    MAP HTML
    =========================
  */

  const html = `
<!DOCTYPE html>

<html>
<head>

<meta charset="utf-8" />

<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0"
/>

<link
  href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css"
  rel="stylesheet"
/>

<style>

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body,
#map {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #05080d;
}


/* =========================
   USER LOCATION
========================= */

.user-location {
  width: 22px;
  height: 22px;

  background: #3b82f6;

  border: 4px solid white;

  border-radius: 50%;

  box-shadow:
    0 0 0 8px rgba(59,130,246,0.25),
    0 0 22px rgba(59,130,246,0.9);
}


/* =========================
   ISSUE MARKER
========================= */

.issue-marker {
  width: 52px;
  height: 52px;

  border-radius: 50%;

  overflow: hidden;

  background: #111827;

  border: 4px solid;

  cursor: pointer;

  box-shadow:
    0 6px 18px rgba(0,0,0,0.9);

  transition:
    transform 0.2s ease;
}

.issue-marker:active {
  transform: scale(1.15);
}

.issue-marker img {
  width: 100%;
  height: 100%;

  object-fit: cover;

  display: block;
}

.issue-placeholder {
  width: 100%;
  height: 100%;

  display: flex;

  align-items: center;
  justify-content: center;

  font-size: 22px;

  background: #1f2937;
}


/* =========================
   RED - REPORTED
========================= */

.reported,
.unresolved,
.rejected {
  border-color: #ef4444;

  box-shadow:
    0 6px 18px rgba(0,0,0,0.9),
    0 0 20px rgba(239,68,68,0.7);
}


/* =========================
   YELLOW - IN PROGRESS
========================= */

.acknowledged,
.in_progress {
  border-color: #facc15;

  box-shadow:
    0 6px 18px rgba(0,0,0,0.9),
    0 0 20px rgba(250,204,21,0.7);
}


/* =========================
   GREEN - RESOLVED
========================= */

.resolved,
.closed {
  border-color: #22c55e;

  box-shadow:
    0 6px 18px rgba(0,0,0,0.9),
    0 0 20px rgba(34,197,94,0.7);
}

</style>

</head>


<body>

<div id="map"></div>

<script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>

<script>

const userLongitude =
  ${location.longitude};

const userLatitude =
  ${location.latitude};

const issues =
  ${JSON.stringify(issues)};


/* =========================
   CREATE MAP
========================= */

const map = new maplibregl.Map({

  container: "map",

  style:
    "https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${MAPTILER_KEY}",

  center: [
    userLongitude,
    userLatitude
  ],

  zoom: 15.5,

  pitch: 60,

  bearing: -20,

  antialias: true

});


map.addControl(
  new maplibregl.NavigationControl(),
  "top-right"
);


/* =========================
   CREATE GEOGRAPHIC CIRCLE
========================= */

function createCircle(
  lng,
  lat,
  radiusMeters,
  points = 64
) {

  const coordinates = [];

  const earthRadius = 6371000;

  for (
    let i = 0;
    i < points;
    i++
  ) {

    const angle =
      (i * 360) / points;

    const dx =
      radiusMeters *
      Math.cos(
        angle * Math.PI / 180
      );

    const dy =
      radiusMeters *
      Math.sin(
        angle * Math.PI / 180
      );

    const newLat =
      lat +
      (dy / earthRadius) *
      (180 / Math.PI);

    const newLng =
      lng +
      (
        dx /
        (
          earthRadius *
          Math.cos(
            lat * Math.PI / 180
          )
        )
      ) *
      (180 / Math.PI);

    coordinates.push([
      newLng,
      newLat
    ]);
  }

  coordinates.push(
    coordinates[0]
  );

  return coordinates;
}


/* =========================
   STATUS COLOR
========================= */

function getStatusColor(status) {

  if (
    status === "resolved" ||
    status === "closed"
  ) {
    return "#22c55e";
  }

  if (
    status === "acknowledged" ||
    status === "in_progress"
  ) {
    return "#facc15";
  }

  return "#ef4444";
}


/* =========================
   MAP READY
========================= */

map.on("load", () => {


  /* =======================
     USER LOCATION MARKER
  ======================= */

  const userMarkerElement =
    document.createElement("div");

  userMarkerElement.className =
    "user-location";

  new maplibregl.Marker({
    element: userMarkerElement,
    anchor: "center"
  })
    .setLngLat([
      userLongitude,
      userLatitude
    ])
    .addTo(map);


  /* =======================
     CREATE HOTSPOT AREAS
  ======================= */

  const hotspotFeatures =
    issues.map((issue) => {

      return {
        type: "Feature",

        properties: {
          id: issue.id,

          color:
            getStatusColor(
              issue.status
            )
        },

        geometry: {
          type: "Polygon",

          coordinates: [
            createCircle(
              issue.longitude,
              issue.latitude,
              180
            )
          ]
        }
      };

    });


  const hotspotData = {
    type: "FeatureCollection",
    features: hotspotFeatures
  };


  map.addSource(
    "issue-hotspots",
    {
      type: "geojson",
      data: hotspotData
    }
  );


  /* OUTER GLOW */

  map.addLayer({

    id:
      "issue-hotspots-glow",

    type:
      "fill",

    source:
      "issue-hotspots",

    minzoom: 13,

    paint: {

      "fill-color":
        ["get", "color"],

      "fill-opacity":
        0.10

    }

  });


  /* MAIN HOTSPOT */

  map.addLayer({

    id:
      "issue-hotspots-fill",

    type:
      "fill",

    source:
      "issue-hotspots",

    minzoom: 14,

    paint: {

      "fill-color":
        ["get", "color"],

      "fill-opacity":
        0.20

    }

  });


  /* HOTSPOT BORDER */

  map.addLayer({

    id:
      "issue-hotspots-border",

    type:
      "line",

    source:
      "issue-hotspots",

    minzoom: 14,

    paint: {

      "line-color":
        ["get", "color"],

      "line-width":
        2,

      "line-opacity":
        0.8,

      "line-blur":
        1

    }

  });


  /* =======================
     ISSUE IMAGE MARKERS
  ======================= */

  const issueMarkers = [];


  issues.forEach((issue) => {

    const markerElement =
      document.createElement("div");


    markerElement.className =
      "issue-marker " +
      issue.status;


    if (issue.image) {

      const image =
        document.createElement("img");

      image.src =
        issue.image;

      image.onerror = function() {

        markerElement.innerHTML =
          '<div class="issue-placeholder">⚠</div>';

      };

      markerElement.appendChild(
        image
      );

    } else {

      markerElement.innerHTML =
        '<div class="issue-placeholder">⚠</div>';

    }


    const marker =
      new maplibregl.Marker({

        element:
          markerElement,

        anchor:
          "center"

      })
        .setLngLat([
          issue.longitude,
          issue.latitude
        ])
        .addTo(map);


    issueMarkers.push({
      marker,
      issue
    });


    /* CLICK → FLY TO ISSUE */

    markerElement.addEventListener(
      "click",
      function() {

        map.flyTo({

          center: [
            issue.longitude,
            issue.latitude
          ],

          zoom: 17,

          pitch: 65,

          bearing: -20,

          duration: 1000,

          essential: true

        });

      }
    );

  });


  /* =======================
     MARKER VISIBILITY
  ======================= */

  function updateMarkerVisibility() {

    const zoom =
      map.getZoom();

    const bounds =
      map.getBounds();


    issueMarkers.forEach(
      ({ marker, issue }) => {

        const element =
          marker.getElement();


        /*
          HIDE ALL ISSUES
          WHEN ZOOMED OUT
        */

        if (zoom < 14) {

          element.style.display =
            "none";

          return;
        }


        /*
          ONLY SHOW IF THE
          ISSUE IS NEAR THE
          CURRENT MAP VIEW
        */

        const padding =
          0.01;


        const isVisible =

          issue.latitude >=
            bounds.getSouth() - padding &&

          issue.latitude <=
            bounds.getNorth() + padding &&

          issue.longitude >=
            bounds.getWest() - padding &&

          issue.longitude <=
            bounds.getEast() + padding;


        element.style.display =
          isVisible
            ? "block"
            : "none";

      }
    );

  }


  map.on(
    "moveend",
    updateMarkerVisibility
  );


  map.on(
    "zoomend",
    updateMarkerVisibility
  );


  updateMarkerVisibility();

});

</script>

</body>
</html>
`;

  return (
    <View style={styles.container}>

      <WebView
        originWhitelist={["*"]}
        source={{ html }}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        style={styles.map}
      />

    </View>
  );
}


const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#05080d",
  },

  map: {
    flex: 1,
  },

  loading: {
    flex: 1,

    justifyContent:
      "center",

    alignItems:
      "center",

    backgroundColor:
      "#05080d",
  },

  loadingText: {
    marginTop: 12,

    color: "#9CA3AF",

    fontSize: 14,
  },

});