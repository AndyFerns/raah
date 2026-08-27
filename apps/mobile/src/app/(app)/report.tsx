import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import { useColorScheme } from 'react-native';
import Colors from '@/constants/Colors';

import { supabase } from '@/lib/supabase';

const MAPTILER_KEY = process.env.EXPO_PUBLIC_MAPTILER_API_KEY;

type Step = 'location' | 'nearby' | 'form';

type Coordinates = {
  latitude: number;
  longitude: number;
};

type IssueStatus =
  | 'reported'
  | 'acknowledged'
  | 'in_progress'
  | 'resolved'
  | 'rejected'
  | 'closed';

type IssueCategory =
  | 'roads'
  | 'water'
  | 'sanitation'
  | 'electricity'
  | 'street_lighting'
  | 'drainage'
  | 'public_safety'
  | 'environment'
  | 'public_property'
  | 'other';

type NearbyIssue = {
  id: string;
  title: string;
  description: string | null;
  category: IssueCategory;
  status: IssueStatus;
  location_name: string | null;
  latitude: number;
  longitude: number;
  support_count: number;
  created_at: string;
};

type MediaItem = {
  uri: string;
  type: 'image' | 'video';
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
};

const SEARCH_RADIUS_METERS = 1000;

const categoryOptions: {
  value: IssueCategory;
  label: string;
}[] = [
    { value: 'roads', label: 'Roads' },
    { value: 'water', label: 'Water' },
    { value: 'sanitation', label: 'Sanitation' },
    { value: 'electricity', label: 'Electricity' },
    { value: 'street_lighting', label: 'Street lights' },
    { value: 'drainage', label: 'Drainage' },
    { value: 'public_safety', label: 'Public safety' },
    { value: 'environment', label: 'Environment' },
    { value: 'public_property', label: 'Public property' },
    { value: 'other', label: 'Other' },
  ];

function haversineDistance(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number
) {
  const earthRadius = 6371000;

  const latitudeDifference =
    ((latitude2 - latitude1) * Math.PI) / 180;

  const longitudeDifference =
    ((longitude2 - longitude1) * Math.PI) / 180;

  const a =
    Math.sin(latitudeDifference / 2) *
    Math.sin(latitudeDifference / 2) +
    Math.cos((latitude1 * Math.PI) / 180) *
    Math.cos((latitude2 * Math.PI) / 180) *
    Math.sin(longitudeDifference / 2) *
    Math.sin(longitudeDifference / 2);

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return earthRadius * c;
}

function formatDistance(distance: number) {
  if (distance < 1000) {
    return `${Math.round(distance)} m away`;
  }

  return `${(distance / 1000).toFixed(1)} km away`;
}

function formatTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();

  const difference =
    now.getTime() - date.getTime();

  const minutes = Math.floor(
    difference / 60000
  );

  if (minutes < 1) {
    return 'Reported just now';
  }

  if (minutes < 60) {
    return `Reported ${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `Reported ${hours} hour${hours === 1 ? '' : 's'
      } ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `Reported ${days} day${days === 1 ? '' : 's'
      } ago`;
  }

  return `Reported ${date.toLocaleDateString()}`;
}

function getStatusLabel(status: IssueStatus) {
  switch (status) {
    case 'reported':
      return 'Reported';

    case 'acknowledged':
      return 'Acknowledged';

    case 'in_progress':
      return 'In progress';

    case 'resolved':
      return 'Resolved';

    case 'rejected':
      return 'Rejected';

    case 'closed':
      return 'Closed';

    default:
      return status;
  }
}

function getStatusStyle(status: IssueStatus, styles: any) {
  switch (status) {
    case 'resolved':
      return styles.statusResolved;

    case 'in_progress':
      return styles.statusProgress;

    case 'acknowledged':
      return styles.statusAcknowledged;

    case 'rejected':
      return styles.statusRejected;

    case 'closed':
      return styles.statusClosed;

    default:
      return styles.statusReported;
  }
}

function getCategoryLabel(category: IssueCategory) {
  return (
    categoryOptions.find(
      (item) => item.value === category
    )?.label ?? category
  );
}

function createFileName(
  originalName: string | null | undefined,
  fallbackExtension: string
) {
  const safeName =
    originalName
      ?.replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_') ||
    `file.${fallbackExtension}`;

  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}-${safeName}`;
}

export default function ReportScreen() {
  const isDark = useColorScheme() === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const styles = createStyles(colors);
  const [step, setStep] =
    useState<Step>('location');

  const [locationLabel, setLocationLabel] =
    useState<string | null>(null);

  const [coordinates, setCoordinates] =
    useState<Coordinates | null>(null);

  const [nearbyIssues, setNearbyIssues] =
    useState<NearbyIssue[]>([]);

  const [loadingLocation, setLoadingLocation] =
    useState(false);

  const [loadingNearby, setLoadingNearby] =
    useState(false);

  const [supportingIssueId, setSupportingIssueId] =
    useState<string | null>(null);

  const [mapVisible, setMapVisible] =
    useState(false);

  const [title, setTitle] =
    useState('');

  const [description, setDescription] =
    useState('');

  const [category, setCategory] =
    useState<IssueCategory>('other');

  const [media, setMedia] =
    useState<MediaItem[]>([]);

  const [document, setDocument] =
    useState<DocumentPicker.DocumentPickerAsset | null>(
      null
    );

  const [submitting, setSubmitting] =
    useState(false);

  async function getReadableLocation(
    latitude: number,
    longitude: number
  ) {
    try {
      const addresses =
        await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });

      const address = addresses[0];

      if (!address) {
        return 'Selected location';
      }

      const locationParts = [
        address.name,
        address.street,
        address.district,
        address.city,
      ].filter(
        (item, index, array) =>
          Boolean(item) &&
          array.indexOf(item) === index
      );

      return (
        locationParts.join(', ') ||
        'Selected location'
      );
    } catch {
      return 'Selected location';
    }
  }

  async function fetchNearbyIssues(
    location: Coordinates
  ) {
    setLoadingNearby(true);

    try {
      /*
       * Approximate 1 km bounding box.
       * Final filtering is done with haversine distance.
       */
      const latitudeDelta =
        SEARCH_RADIUS_METERS / 111320;

      const longitudeDelta =
        SEARCH_RADIUS_METERS /
        (111320 *
          Math.cos(
            (location.latitude * Math.PI) / 180
          ));

      const {
        data,
        error,
      } = await supabase
        .from('issues')
        .select(`
          id,
          title,
          description,
          category,
          status,
          location_name,
          latitude,
          longitude,
          support_count,
          created_at
        `)
        .gte(
          'latitude',
          location.latitude - latitudeDelta
        )
        .lte(
          'latitude',
          location.latitude + latitudeDelta
        )
        .gte(
          'longitude',
          location.longitude - longitudeDelta
        )
        .lte(
          'longitude',
          location.longitude + longitudeDelta
        )
        .order('created_at', {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      const filteredIssues =
        ((data ?? []) as NearbyIssue[])
          .map((issue) => ({
            ...issue,
            distance: haversineDistance(
              location.latitude,
              location.longitude,
              issue.latitude,
              issue.longitude
            ),
          }))
          .filter(
            (issue) =>
              issue.distance <=
              SEARCH_RADIUS_METERS
          )
          .sort(
            (a, b) =>
              a.distance - b.distance
          )
          .map(
            ({ distance: _distance, ...issue }) =>
              issue
          );

      setNearbyIssues(filteredIssues);
    } catch (error) {
      console.error(
        'Nearby issues error:',
        error
      );

      Alert.alert(
        'Could not load nearby issues',
        'Please check your internet connection and try again.'
      );

      setNearbyIssues([]);
    } finally {
      setLoadingNearby(false);
    }
  }

  async function continueWithLocation(
    location: Coordinates
  ) {
    setCoordinates(location);

    const readableLocation =
      await getReadableLocation(
        location.latitude,
        location.longitude
      );

    setLocationLabel(readableLocation);

    await fetchNearbyIssues(location);

    setStep('nearby');
  }

  async function useCurrentLocation() {
    setLoadingLocation(true);

    try {
      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Location permission needed',
          'Please allow location access or choose the issue location on the map.'
        );

        return;
      }

      const position =
        await Location.getCurrentPositionAsync({
          accuracy:
            Location.Accuracy.High,
        });

      await continueWithLocation({
        latitude:
          position.coords.latitude,
        longitude:
          position.coords.longitude,
      });
    } catch (error) {
      console.error(
        'Location error:',
        error
      );

      Alert.alert(
        'Location unavailable',
        'We could not get your current location. Please try again or choose a location on the map.'
      );
    } finally {
      setLoadingLocation(false);
    }
  }

  function openMapPicker() {
    setMapVisible(true);
  }

  async function handleMapMessage(
    event: any
  ) {
    try {
      const message =
        JSON.parse(event.nativeEvent.data);

      if (message.type !== 'location-selected') {
        return;
      }

      const location: Coordinates = {
        latitude: Number(
          message.latitude
        ),
        longitude: Number(
          message.longitude
        ),
      };

      if (
        Number.isNaN(location.latitude) ||
        Number.isNaN(location.longitude)
      ) {
        return;
      }

      setMapVisible(false);

      await continueWithLocation(location);
    } catch (error) {
      console.error(
        'Map selection error:',
        error
      );
    }
  }

  async function supportIssue(
    issue: NearbyIssue
  ) {
    setSupportingIssueId(issue.id);

    try {
      const {
        data: authData,
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      const user = authData.user;

      if (!user) {
        Alert.alert(
          'Login required',
          'Please log in to support an issue.'
        );

        return;
      }

      const {
        data: existingSupport,
        error: existingError,
      } = await supabase
        .from('issue_supports')
        .select('issue_id')
        .eq('issue_id', issue.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingError) {
        throw existingError;
      }

      if (existingSupport) {
        Alert.alert(
          'Already supported',
          'You have already supported this issue.'
        );

        return;
      }

      const { error } =
        await supabase
          .from('issue_supports')
          .insert({
            issue_id: issue.id,
            user_id: user.id,
          });

      if (error) {
        throw error;
      }

      setNearbyIssues((current) =>
        current.map((item) =>
          item.id === issue.id
            ? {
              ...item,
              support_count:
                item.support_count + 1,
            }
            : item
        )
      );

      Alert.alert(
        'Support added',
        'Your support has been added to this issue.'
      );
    } catch (error: any) {
      console.error(
        'Support error:',
        error
      );

      Alert.alert(
        'Could not support issue',
        error?.message ??
        'Please try again.'
      );
    } finally {
      setSupportingIssueId(null);
    }
  }

  async function pickMedia() {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permission needed',
          'Please allow access to your photos and videos.'
        );

        return;
      }

      const remainingSlots =
        5 - media.length;

      if (remainingSlots <= 0) {
        Alert.alert(
          'Maximum reached',
          'You can attach up to 5 photos or videos.'
        );

        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images', 'videos'],
          allowsMultipleSelection: true,
          selectionLimit: remainingSlots,
          quality: 0.8,
        });

      if (result.canceled) {
        return;
      }

      const selectedMedia: MediaItem[] =
        result.assets.map((asset) => ({
          uri: asset.uri,
          type:
            asset.type === 'video'
              ? 'video'
              : 'image',
          fileName: asset.fileName,
          mimeType: asset.mimeType,
          fileSize: asset.fileSize,
        }));

      setMedia((current) => [
        ...current,
        ...selectedMedia,
      ]);
    } catch (error) {
      console.error(
        'Media picker error:',
        error
      );

      Alert.alert(
        'Could not select media',
        'Please try again.'
      );
    }
  }

  async function pickDocument() {
    try {
      const result =
        await DocumentPicker.getDocumentAsync({
          copyToCacheDirectory: true,
          multiple: false,
        });

      if (result.canceled) {
        return;
      }

      setDocument(result.assets[0]);
    } catch (error) {
      console.error(
        'Document picker error:',
        error
      );

      Alert.alert(
        'Could not select file',
        'Please try again.'
      );
    }
  }

  function removeMedia(index: number) {
    setMedia((current) =>
      current.filter(
        (_, itemIndex) =>
          itemIndex !== index
      )
    );
  }

  async function uploadMediaFiles(
    userId: string,
    issueId: string
  ) {
    for (const item of media) {
      const extension =
        item.type === 'video'
          ? 'mp4'
          : 'jpg';

      const fileName = createFileName(
        item.fileName,
        extension
      );

      const storagePath =
        `${userId}/${issueId}/${fileName}`;

      const response =
        await fetch(item.uri);

      const arrayBuffer =
        await response.arrayBuffer();

      const contentType =
        item.mimeType ??
        (item.type === 'video'
          ? 'video/mp4'
          : 'image/jpeg');

      const { error: uploadError } =
        await supabase.storage
          .from('issue-media')
          .upload(
            storagePath,
            arrayBuffer,
            {
              contentType,
              upsert: false,
            }
          );

      if (uploadError) {
        throw uploadError;
      }

      const { error: mediaError } =
        await supabase
          .from('issue_media')
          .insert({
            issue_id: issueId,
            storage_path: storagePath,
            original_name:
              item.fileName ?? fileName,
            mime_type: contentType,
            type: item.type,
            size_bytes:
              item.fileSize ?? null,
          });

      if (mediaError) {
        throw mediaError;
      }
    }
  }

  async function uploadDocumentFile(
    userId: string,
    issueId: string
  ) {
    if (!document) {
      return;
    }

    const fileName = createFileName(
      document.name,
      'file'
    );

    const storagePath =
      `${userId}/${issueId}/${fileName}`;

    const response =
      await fetch(document.uri);

    const arrayBuffer =
      await response.arrayBuffer();

    const contentType =
      document.mimeType ??
      'application/octet-stream';

    const { error: uploadError } =
      await supabase.storage
        .from('issue-files')
        .upload(
          storagePath,
          arrayBuffer,
          {
            contentType,
            upsert: false,
          }
        );

    if (uploadError) {
      throw uploadError;
    }

    const { error: documentError } =
      await supabase
        .from('issue_documents')
        .insert({
          issue_id: issueId,
          storage_path: storagePath,
          original_name:
            document.name,
          mime_type: contentType,
          size_bytes:
            document.size ?? null,
        });

    if (documentError) {
      throw documentError;
    }
  }

  async function submitIssue() {
    if (!title.trim()) {
      Alert.alert(
        'Add a title',
        'Please describe the issue with a short title.'
      );

      return;
    }

    if (!coordinates) {
      Alert.alert(
        'Location required',
        'Please select the issue location.'
      );

      return;
    }

    setSubmitting(true);

    try {
      const {
        data: authData,
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      const user = authData.user;

      if (!user) {
        Alert.alert(
          'Login required',
          'Please log in before reporting an issue.'
        );

        return;
      }

      const {
        data: issue,
        error: issueError,
      } = await supabase
        .from('issues')
        .insert({
          user_id: user.id,
          title: title.trim(),
          description:
            description.trim() || null,
          category,
          location_name:
            locationLabel,
          latitude:
            coordinates.latitude,
          longitude:
            coordinates.longitude,
        })
        .select('id')
        .single();

      if (issueError) {
        throw issueError;
      }

      await uploadMediaFiles(
        user.id,
        issue.id
      );

      await uploadDocumentFile(
        user.id,
        issue.id
      );

      Alert.alert(
        'Issue reported successfully',
        'Your report has been submitted.'
      );

      setTitle('');
      setDescription('');
      setCategory('other');
      setMedia([]);
      setDocument(null);
      setCoordinates(null);
      setLocationLabel(null);
      setNearbyIssues([]);
      setStep('location');
    } catch (error: any) {
      console.error(
        'Submit issue error:',
        error
      );

      Alert.alert(
        'Could not submit issue',
        error?.message ??
        'Something went wrong. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  const mapCenter =
    coordinates ?? {
      latitude: 19.155,
      longitude: 72.9986,
    };

  const mapHtml = `
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
    box-sizing: border-box;
  }

  html,
  body,
  #map {
    margin: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #0a0f1a;
  }

  .confirm {
    position: fixed;
    bottom: 28px;
    left: 20px;
    right: 20px;
    z-index: 10;

    background: #22c55e;
    color: white;

    border: none;
    border-radius: 16px;

    padding: 17px;

    font-size: 16px;
    font-weight: 700;
  }

  .hint {
    position: fixed;
    top: 20px;
    left: 20px;
    right: 20px;

    z-index: 10;

    background: rgba(15, 23, 42, 0.92);
    color: white;

    border-radius: 14px;

    padding: 14px;

    font-family: Arial, sans-serif;
    font-size: 14px;

    text-align: center;
  }

  .maplibregl-ctrl-group {
    margin-top: 90px !important;
  }
</style>
</head>

<body>

<div id="map"></div>

<div class="hint">
  Tap the exact location of the issue
</div>

<button
  id="confirmButton"
  class="confirm"
>
  Confirm location
</button>

<script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>

<script>
  const initialLongitude =
    ${mapCenter.longitude};

  const initialLatitude =
    ${mapCenter.latitude};

  let selectedLongitude =
    initialLongitude;

  let selectedLatitude =
    initialLatitude;

  const map =
    new maplibregl.Map({
      container: "map",

      style:
        "https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${MAPTILER_KEY}",

      center: [
        initialLongitude,
        initialLatitude
      ],

      zoom: 16,

      pitch: 55,

      bearing: -20,

      antialias: true
    });

  map.addControl(
    new maplibregl.NavigationControl(),
    "top-right"
  );

  const marker =
    new maplibregl.Marker({
      color: "#22c55e",
      draggable: true
    })
      .setLngLat([
        initialLongitude,
        initialLatitude
      ])
      .addTo(map);

  map.on(
    "click",
    function(event) {
      selectedLongitude =
        event.lngLat.lng;

      selectedLatitude =
        event.lngLat.lat;

      marker.setLngLat([
        selectedLongitude,
        selectedLatitude
      ]);
    }
  );

  marker.on(
    "dragend",
    function() {
      const position =
        marker.getLngLat();

      selectedLongitude =
        position.lng;

      selectedLatitude =
        position.lat;
    }
  );

  document
    .getElementById(
      "confirmButton"
    )
    .addEventListener(
      "click",
      function() {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({
            type:
              "location-selected",

            latitude:
              selectedLatitude,

            longitude:
              selectedLongitude
          })
        );
      }
    );
</script>

</body>
</html>
`;

  if (step === 'location') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            Report an issue
          </Text>

          <Text
            style={styles.headerSubtitle}
          >
            First, choose where the issue is located.
            We will check whether it has already been
            reported nearby.
          </Text>
        </View>

        <View style={styles.locationSection}>
          <Pressable
            style={[
              styles.primaryLocationCard,
              loadingLocation &&
              styles.cardDisabled,
            ]}
            onPress={useCurrentLocation}
            disabled={loadingLocation}
          >
            <View
              style={styles.locationIcon}
            >
              <Text
                style={
                  styles.locationIconText
                }
              >
                ⌖
              </Text>
            </View>

            <View
              style={styles.locationContent}
            >
              <Text
                style={styles.locationTitle}
              >
                Use current location
              </Text>

              <Text
                style={
                  styles.locationDescription
                }
              >
                Detect your location automatically.
              </Text>
            </View>

            {loadingLocation ? (
              <ActivityIndicator
                color="#168A52"
              />
            ) : (
              <Text style={styles.arrow}>
                ›
              </Text>
            )}
          </Pressable>

          <Pressable
            style={styles.locationCard}
            onPress={openMapPicker}
            disabled={loadingLocation}
          >
            <View
              style={styles.locationIcon}
            >
              <Text
                style={
                  styles.locationIconText
                }
              >
                ◎
              </Text>
            </View>

            <View
              style={styles.locationContent}
            >
              <Text
                style={styles.locationTitle}
              >
                Choose on map
              </Text>

              <Text
                style={
                  styles.locationDescription
                }
              >
                Select the exact location manually.
              </Text>
            </View>

            <Text style={styles.arrow}>
              ›
            </Text>
          </Pressable>
        </View>

        <Text style={styles.helperText}>
          Checking existing reports first helps avoid
          duplicate issues.
        </Text>

        <Modal
          visible={mapVisible}
          animationType="slide"
          onRequestClose={() =>
            setMapVisible(false)
          }
        >
          <View style={styles.mapModal}>
            <Pressable
              style={styles.closeMapButton}
              onPress={() =>
                setMapVisible(false)
              }
            >
              <Text
                style={
                  styles.closeMapButtonText
                }
              >
                ×
              </Text>
            </Pressable>

            <WebView
              originWhitelist={['*']}
              source={{
                html: mapHtml,
              }}
              javaScriptEnabled
              domStorageEnabled
              onMessage={
                handleMapMessage
              }
              style={styles.mapWebView}
            />
          </View>
        </Modal>
      </View>
    );
  }

  if (step === 'nearby') {
    return (
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            styles.scrollContent
          }
        >
          <Pressable
            onPress={() =>
              setStep('location')
            }
            style={styles.backButton}
          >
            <Text style={styles.backText}>
              ‹ Back
            </Text>
          </Pressable>

          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              Issues nearby
            </Text>

            <Text
              style={styles.headerSubtitle}
            >
              Existing reports within approximately
              1 km of the selected location.
            </Text>
          </View>

          <View
            style={
              styles.selectedLocation
            }
          >
            <Text
              style={
                styles.selectedLocationLabel
              }
            >
              SELECTED LOCATION
            </Text>

            <Text
              style={
                styles.selectedLocationText
              }
            >
              {locationLabel ??
                'Selected location'}
            </Text>
          </View>

          {loadingNearby ? (
            <View
              style={styles.loadingNearby}
            >
              <ActivityIndicator
                size="large"
                color="#168A52"
              />

              <Text
                style={
                  styles.loadingNearbyText
                }
              >
                Checking nearby issues...
              </Text>
            </View>
          ) : nearbyIssues.length > 0 ? (
            <View
              style={styles.issueList}
            >
              {nearbyIssues.map(
                (issue) => {
                  const distance =
                    coordinates
                      ? haversineDistance(
                        coordinates.latitude,
                        coordinates.longitude,
                        issue.latitude,
                        issue.longitude
                      )
                      : 0;

                  return (
                    <View
                      key={issue.id}
                      style={
                        styles.issueCard
                      }
                    >
                      <View
                        style={
                          styles.issueTopRow
                        }
                      >
                        <Text
                          style={
                            styles.issueCategory
                          }
                        >
                          {getCategoryLabel(
                            issue.category
                          )}
                        </Text>

                        <View
                          style={[
                            styles.statusBadge,
                            getStatusStyle(
                              issue.status,
                              styles
                            ),
                          ]}
                        >
                          <Text
                            style={
                              styles.statusText
                            }
                          >
                            {getStatusLabel(
                              issue.status
                            )}
                          </Text>
                        </View>
                      </View>

                      <Text
                        style={
                          styles.issueTitle
                        }
                      >
                        {issue.title}
                      </Text>

                      {issue.description ? (
                        <Text
                          style={
                            styles.issueDescription
                          }
                          numberOfLines={2}
                        >
                          {
                            issue.description
                          }
                        </Text>
                      ) : null}

                      <Text
                        style={
                          styles.issueMeta
                        }
                      >
                        {formatDistance(
                          distance
                        )}{' '}
                        ·{' '}
                        {formatTime(
                          issue.created_at
                        )}
                      </Text>

                      <View
                        style={
                          styles.issueFooter
                        }
                      >
                        <Text
                          style={
                            styles.supportCount
                          }
                        >
                          {
                            issue.support_count
                          }{' '}
                          support
                          {issue.support_count ===
                            1
                            ? ''
                            : 's'}
                        </Text>

                        <Pressable
                          style={[
                            styles.supportButton,
                            supportingIssueId ===
                            issue.id &&
                            styles.cardDisabled,
                          ]}
                          onPress={() =>
                            supportIssue(
                              issue
                            )
                          }
                          disabled={
                            supportingIssueId ===
                            issue.id
                          }
                        >
                          {supportingIssueId ===
                            issue.id ? (
                            <ActivityIndicator
                              color="#FFFFFF"
                              size="small"
                            />
                          ) : (
                            <Text
                              style={
                                styles.supportButtonText
                              }
                            >
                              Support
                            </Text>
                          )}
                        </Pressable>
                      </View>
                    </View>
                  );
                }
              )}
            </View>
          ) : (
            <View
              style={
                styles.noIssuesCard
              }
            >
              <Text
                style={
                  styles.noIssuesTitle
                }
              >
                No nearby reports found
              </Text>

              <Text
                style={
                  styles.noIssuesText
                }
              >
                There are currently no reported issues
                close to this location.
              </Text>
            </View>
          )}

          <View style={styles.divider} />

          <Text
            style={styles.notFoundTitle}
          >
            Don't see your issue?
          </Text>

          <Text
            style={styles.notFoundText}
          >
            Create a new report with details and
            supporting evidence.
          </Text>

          <Pressable
            style={styles.continueButton}
            onPress={() =>
              setStep('form')
            }
          >
            <Text
              style={
                styles.continueButtonText
              }
            >
              Create new issue
            </Text>
          </Pressable>

          <View
            style={{ height: 110 }}
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.scrollContent
        }
      >
        <Pressable
          onPress={() =>
            setStep('nearby')
          }
          style={styles.backButton}
        >
          <Text style={styles.backText}>
            ‹ Back
          </Text>
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            New issue
          </Text>

          <Text
            style={styles.headerSubtitle}
          >
            Add enough detail to make the report useful
            and verifiable.
          </Text>
        </View>

        <View
          style={styles.selectedLocation}
        >
          <Text
            style={
              styles.selectedLocationLabel
            }
          >
            ISSUE LOCATION
          </Text>

          <Text
            style={
              styles.selectedLocationText
            }
          >
            {locationLabel ??
              'Selected location'}
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>
              Issue title
            </Text>

            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="What is the issue?"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
              maxLength={150}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>
              Category
            </Text>

            <View
              style={
                styles.categoryContainer
              }
            >
              {categoryOptions.map(
                (item) => (
                  <Pressable
                    key={item.value}
                    style={[
                      styles.categoryChip,
                      category ===
                      item.value &&
                      styles.categoryChipActive,
                    ]}
                    onPress={() =>
                      setCategory(
                        item.value
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        category ===
                        item.value &&
                        styles.categoryChipTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                )
              )}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>
              Description
            </Text>

            <TextInput
              value={description}
              onChangeText={
                setDescription
              }
              placeholder="Describe the issue and provide useful details."
              placeholderTextColor="#9CA3AF"
              style={[
                styles.input,
                styles.textArea,
              ]}
              multiline
              textAlignVertical="top"
              maxLength={5000}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>
              Photos and videos
            </Text>

            <Pressable
              style={styles.uploadArea}
              onPress={pickMedia}
            >
              <Text
                style={styles.uploadIcon}
              >
                +
              </Text>

              <Text
                style={styles.uploadTitle}
              >
                Add photos or videos
              </Text>

              <Text
                style={styles.uploadText}
              >
                {media.length}/5 files selected
              </Text>
            </Pressable>

            {media.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={
                  false
                }
                contentContainerStyle={
                  styles.mediaList
                }
              >
                {media.map(
                  (item, index) => (
                    <View
                      key={`${item.uri}-${index}`}
                      style={
                        styles.mediaPreview
                      }
                    >
                      {item.type ===
                        'image' ? (
                        <Image
                          source={{
                            uri: item.uri,
                          }}
                          style={
                            styles.previewImage
                          }
                        />
                      ) : (
                        <View
                          style={
                            styles.videoPreview
                          }
                        >
                          <Text
                            style={
                              styles.videoText
                            }
                          >
                            VIDEO
                          </Text>
                        </View>
                      )}

                      <Pressable
                        style={
                          styles.removeMedia
                        }
                        onPress={() =>
                          removeMedia(
                            index
                          )
                        }
                      >
                        <Text
                          style={
                            styles.removeMediaText
                          }
                        >
                          ×
                        </Text>
                      </Pressable>
                    </View>
                  )
                )}
              </ScrollView>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>
              Supporting document
            </Text>

            <Pressable
              style={
                styles.documentButton
              }
              onPress={pickDocument}
            >
              <Text
                style={[
                  styles.documentText,
                  document &&
                  styles.selectedDocumentText,
                ]}
                numberOfLines={1}
              >
                {document
                  ? document.name
                  : 'Attach a file'}
              </Text>

              <Text
                style={
                  styles.optionalText
                }
              >
                Optional
              </Text>
            </Pressable>
          </View>
        </View>

        <Pressable
          style={[
            styles.submitButton,
            (!title.trim() ||
              submitting) &&
            styles.disabledButton,
          ]}
          onPress={submitIssue}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator
              color="#FFFFFF"
            />
          ) : (
            <Text
              style={
                styles.submitButtonText
              }
            >
              Submit issue
            </Text>
          )}
        </Pressable>

        <View style={{ height: 110 }} />
      </ScrollView>
    </View>
  );
}

function createStyles(colors: typeof Colors.light) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: 20,
      paddingTop: 58,
    },

    scrollContent: {
      paddingBottom: 20,
    },

    header: {
      marginBottom: 28,
    },

    headerTitle: {
      fontSize: 30,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.7,
    },

    headerSubtitle: {
      fontSize: 15,
      lineHeight: 23,
      color: colors.textSecondary,
      marginTop: 8,
    },

    locationSection: {
      gap: 12,
    },

    primaryLocationCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderWidth: 1.5,
      borderColor: colors.success,
      borderRadius: 16,
      padding: 18,
    },

    locationCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 18,
    },

    cardDisabled: {
      opacity: 0.65,
    },

    locationIcon: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },

    locationIconText: {
      fontSize: 21,
      color: colors.success,
    },

    locationContent: {
      flex: 1,
    },

    locationTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },

    locationDescription: {
      fontSize: 13,
      lineHeight: 19,
      color: colors.textSecondary,
      marginTop: 3,
    },

    arrow: {
      fontSize: 28,
      color: colors.tabIconDefault,
    },

    helperText: {
      marginTop: 24,
      fontSize: 12,
      lineHeight: 19,
      color: colors.tabIconDefault,
    },

    backButton: {
      alignSelf: 'flex-start',
      paddingVertical: 8,
      marginBottom: 12,
    },

    backText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#404040',
    },

    selectedLocation: {
      backgroundColor: '#ECEFED',
      borderRadius: 12,
      padding: 14,
      marginBottom: 20,
    },

    selectedLocationLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.textSecondary,
      letterSpacing: 0.8,
    },

    selectedLocationText: {
      marginTop: 5,
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },

    loadingNearby: {
      paddingVertical: 45,
      alignItems: 'center',
    },

    loadingNearbyText: {
      marginTop: 14,
      fontSize: 14,
      color: colors.textSecondary,
    },

    issueList: {
      gap: 12,
    },

    issueCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 18,
      borderWidth: 1,
      borderColor: '#E5E5E5',
    },

    issueTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 10,
    },

    issueCategory: {
      flex: 1,
      fontSize: 11,
      fontWeight: '800',
      color: colors.success,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },

    statusBadge: {
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 20,
    },

    statusReported: {
      backgroundColor: '#FEE2E2',
    },

    statusAcknowledged: {
      backgroundColor: '#DBEAFE',
    },

    statusProgress: {
      backgroundColor: '#FEF3C7',
    },

    statusResolved: {
      backgroundColor: '#DCFCE7',
    },

    statusRejected: {
      backgroundColor: '#F3E8FF',
    },

    statusClosed: {
      backgroundColor: colors.border,
    },

    statusText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#404040',
    },

    issueTitle: {
      marginTop: 10,
      fontSize: 17,
      lineHeight: 23,
      fontWeight: '700',
      color: colors.text,
    },

    issueDescription: {
      marginTop: 7,
      fontSize: 13,
      lineHeight: 20,
      color: colors.textSecondary,
    },

    issueMeta: {
      marginTop: 10,
      fontSize: 12,
      color: colors.textSecondary,
    },

    issueFooter: {
      marginTop: 18,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },

    supportCount: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },

    supportButton: {
      minWidth: 90,
      backgroundColor: colors.text,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      alignItems: 'center',
    },

    supportButtonText: {
      color: colors.card,
      fontSize: 13,
      fontWeight: '700',
    },

    noIssuesCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#E5E5E5',
      padding: 22,
    },

    noIssuesTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.text,
    },

    noIssuesText: {
      marginTop: 7,
      fontSize: 14,
      lineHeight: 21,
      color: colors.textSecondary,
    },

    divider: {
      height: 1,
      backgroundColor: '#E5E5E5',
      marginVertical: 28,
    },

    notFoundTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
    },

    notFoundText: {
      marginTop: 7,
      fontSize: 14,
      lineHeight: 21,
      color: colors.textSecondary,
    },

    continueButton: {
      marginTop: 20,
      paddingVertical: 16,
      borderRadius: 13,
      alignItems: 'center',
      backgroundColor: colors.text,
    },

    continueButtonText: {
      color: colors.card,
      fontSize: 15,
      fontWeight: '700',
    },

    form: {
      gap: 22,
    },

    field: {
      gap: 8,
    },

    label: {
      fontSize: 14,
      fontWeight: '700',
      color: '#404040',
    },

    input: {
      height: 54,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: '#D4D4D4',
      borderRadius: 13,
      paddingHorizontal: 15,
      fontSize: 15,
      color: colors.text,
    },

    textArea: {
      height: 140,
      paddingTop: 15,
    },

    categoryContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },

    categoryChip: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: '#D4D4D4',
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 20,
    },

    categoryChipActive: {
      backgroundColor: colors.success,
      borderColor: colors.success,
    },

    categoryChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#525252',
    },

    categoryChipTextActive: {
      color: colors.card,
    },

    uploadArea: {
      minHeight: 125,
      borderRadius: 14,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.tabIconDefault,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },

    uploadIcon: {
      fontSize: 26,
      color: colors.success,
      marginBottom: 5,
    },

    uploadTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },

    uploadText: {
      marginTop: 4,
      fontSize: 12,
      color: colors.textSecondary,
    },

    mediaList: {
      gap: 10,
      paddingTop: 4,
    },

    mediaPreview: {
      width: 110,
      height: 110,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: '#E5E5E5',
    },

    previewImage: {
      width: '100%',
      height: '100%',
    },

    videoPreview: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.text,
    },

    videoText: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.card,
    },

    removeMedia: {
      position: 'absolute',
      top: 5,
      right: 5,
      width: 25,
      height: 25,
      borderRadius: 13,
      backgroundColor: colors.text,
      alignItems: 'center',
      justifyContent: 'center',
    },

    removeMediaText: {
      color: colors.card,
      fontSize: 18,
      lineHeight: 20,
    },

    documentButton: {
      height: 54,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: '#D4D4D4',
      backgroundColor: colors.card,
      paddingHorizontal: 15,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },

    documentText: {
      flex: 1,
      fontSize: 14,
      color: colors.textSecondary,
    },

    selectedDocumentText: {
      color: colors.text,
      fontWeight: '600',
    },

    optionalText: {
      fontSize: 12,
      color: colors.tabIconDefault,
    },

    submitButton: {
      marginTop: 30,
      minHeight: 54,
      backgroundColor: colors.success,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
    },

    disabledButton: {
      backgroundColor: colors.tabIconDefault,
    },

    submitButtonText: {
      color: colors.card,
      fontSize: 16,
      fontWeight: '700',
    },

    mapModal: {
      flex: 1,
      backgroundColor: '#0A0F1A',
    },

    mapWebView: {
      flex: 1,
    },

    closeMapButton: {
      position: 'absolute',
      zIndex: 20,
      top: 50,
      left: 18,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.text,
      alignItems: 'center',
      justifyContent: 'center',
    },

    closeMapButtonText: {
      color: colors.card,
      fontSize: 28,
      lineHeight: 30,
    },
  });
}
