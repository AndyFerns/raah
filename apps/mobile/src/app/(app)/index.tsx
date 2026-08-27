import { useState, useCallback } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TextInput,
  useColorScheme,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/Colors";

import { supabase } from "@/lib/supabase";

type IssueStatus =
  | "reported"
  | "acknowledged"
  | "in_progress"
  | "resolved"
  | "rejected"
  | "closed";

type DbIssue = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: IssueStatus;
  location_name: string | null;
  latitude: number;
  longitude: number;
  support_count: number;
  created_at: string;
  issue_media?: {
    storage_path: string;
    type: string;
  }[];
};

export default function HomeScreen() {
  const isDark = useColorScheme() === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const styles = createStyles(colors);

  const [name, setName] = useState("Citizen");
  const [issues, setIssues] = useState<DbIssue[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadHome();
    }, [])
  );

  async function loadHome() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      const fullName =
        session.user.user_metadata?.full_name ||
        session.user.email?.split("@")[0] ||
        "Citizen";

      setName(fullName);

      const { data, error } = await supabase
        .from("issues")
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
          created_at,
          issue_media (
            storage_path,
            type
          )
        `)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        console.log("Issues error:", error);
      } else {
        setIssues(data || []);
      }
    } catch (error) {
      console.log("Home loading error:", error);
    } finally {
      setLoading(false);
    }
  }

  function getStatusLabel(status: IssueStatus) {
    switch (status) {
      case "reported":
        return "Reported";
      case "acknowledged":
        return "Acknowledged";
      case "in_progress":
        return "In Progress";
      case "resolved":
        return "Resolved";
      case "rejected":
        return "Rejected";
      case "closed":
        return "Closed";
      default:
        return "Reported";
    }
  }

  function getStatusStyle(status: IssueStatus) {
    switch (status) {
      case "resolved":
      case "closed":
        return {
          backgroundColor: "rgba(34,197,94,0.12)",
          color: "#4ADE80",
          dot: "#22C55E",
        };

      case "in_progress":
      case "acknowledged":
        return {
          backgroundColor: "rgba(250,204,21,0.12)",
          color: "#FACC15",
          dot: "#EAB308",
        };

      case "rejected":
        return {
          backgroundColor: "rgba(148,163,184,0.12)",
          color: "#94A3B8",
          dot: "#64748B",
        };

      default:
        return {
          backgroundColor: "rgba(239,68,68,0.12)",
          color: "#F87171",
          dot: "#EF4444",
        };
    }
  }

  function getIssueImage(issue: DbIssue) {
    const media = issue.issue_media?.find(
      (item) => item.type === "image"
    );

    if (!media?.storage_path) return null;

    if (media.storage_path.startsWith("http")) {
      return media.storage_path;
    }

    const { data } = supabase.storage
      .from("issue-media")
      .getPublicUrl(media.storage_path);

    return data.publicUrl;
  }

  function getTimeAgo(date: string) {
    const now = new Date().getTime();
    const created = new Date(date).getTime();
    const difference = now - created;

    const minutes = Math.floor(difference / 60000);
    const hours = Math.floor(difference / 3600000);
    const days = Math.floor(difference / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;

    return `${days}d ago`;
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const activeIssues = issues.filter(
    (issue) =>
      issue.status === "reported" ||
      issue.status === "acknowledged" ||
      issue.status === "in_progress"
  );

  const resolvedIssues = issues.filter(
    (issue) =>
      issue.status === "resolved" ||
      issue.status === "closed"
  );

  const totalSupport = issues.reduce(
    (total, issue) => total + issue.support_count,
    0
  );

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>
              {getGreeting()},{" "}
              <Text style={styles.greetingName}>{name}</Text> 👋
            </Text>
            <View style={styles.locationContainer}>
              <Ionicons name="location" size={14} color="#F43F5E" />
              <Text style={styles.locationText}>Airoli, Navi Mumbai</Text>
            </View>
          </View>
          <Pressable
            style={styles.avatar}
            onPress={() => router.push("/profile")}
          >
            <Text style={styles.avatarText}>
              {name.charAt(0).toUpperCase()}
            </Text>
          </Pressable>
        </View>

        {/* SEARCH */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search issues or locations..."
            placeholderTextColor="#64748B"
          />
        </View>

        {/* HERO / ACTIONS */}
        <View style={styles.heroSection}>
          <Text style={styles.heroSubtitle}>
            What's happening in your neighborhood today?
          </Text>
          <View style={styles.actionRow}>
            <Pressable
              style={styles.primaryAction}
              onPress={() => router.push("/report")}
            >
              <View style={styles.primaryActionIcon}>
                <Ionicons name="megaphone" size={16} color="#6366F1" />
              </View>
              <Text style={styles.primaryActionText}>Report Issue</Text>
            </Pressable>
            
            <Pressable
              style={styles.secondaryAction}
              onPress={() => router.push("/map")}
            >
              <View style={styles.secondaryActionIcon}>
                <Ionicons name="map" size={16} color="#E2E8F0" />
              </View>
              <Text style={styles.secondaryActionText}>Explore Map</Text>
            </Pressable>
          </View>
        </View>

        {/* STATS */}
        <View style={styles.compactStats}>
          <View style={styles.compactStatItem}>
            <View style={[styles.glassIcon, { backgroundColor: '#FACC15' }]}>
              <Ionicons name="warning" size={16} color="#422006" />
            </View>
            <Text style={styles.compactStatNumber}>{activeIssues.length}</Text>
            <Text style={styles.compactStatLabel}>Active</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.compactStatItem}>
            <View style={[styles.glassIcon, { backgroundColor: '#4ADE80' }]}>
              <Ionicons name="checkmark-circle" size={16} color="#14532D" />
            </View>
            <Text style={styles.compactStatNumber}>{resolvedIssues.length}</Text>
            <Text style={styles.compactStatLabel}>Resolved</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.compactStatItem}>
            <View style={[styles.glassIcon, { backgroundColor: '#60A5FA' }]}>
              <Ionicons name="people" size={16} color="#1E3A8A" />
            </View>
            <Text style={styles.compactStatNumber}>{totalSupport}</Text>
            <Text style={styles.compactStatLabel}>Supports</Text>
          </View>
        </View>

        {/* SECTION HEADER */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Issues around you</Text>
          <Pressable onPress={() => router.push("/map")} style={styles.mapLink}>
            <Text style={styles.mapLinkText}>View map</Text>
            <Feather name="arrow-right" size={14} color="#6366F1" />
          </Pressable>
        </View>

        {/* ISSUE LIST */}
        {issues.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Feather name="check" size={24} color="#4ADE80" />
            </View>
            <Text style={styles.emptyTitle}>All caught up</Text>
            <Text style={styles.emptyText}>Your neighbourhood has no active issues.</Text>
          </View>
        ) : (
          <>
            <View style={styles.issueGrid}>
              {issues.map((issue) => {
                const statusStyle = getStatusStyle(issue.status);
                const image = getIssueImage(issue);

                return (
                  <Pressable
                    key={issue.id}
                    style={styles.issueGridCard}
                    onPress={() => router.push(`/issue/${issue.id}` as any)}
                  >
                    <View style={styles.gridImageContainer}>
                      {image ? (
                        <Image source={{ uri: image }} style={styles.issueImage} />
                      ) : (
                        <View style={styles.noImage}>
                          <Feather name="image" size={24} color="#475569" />
                        </View>
                      )}
                    </View>

                    <View style={styles.gridIssueContent}>
                      <Text style={styles.gridIssueTitle} numberOfLines={2}>
                        {issue.title}
                      </Text>

                      <Text style={styles.gridLocation} numberOfLines={1}>
                        <Feather name="map-pin" size={10} color="#94A3B8" />{" "}
                        {issue.location_name || "Nearby"}
                      </Text>

                      <View style={styles.gridIssueBottom}>
                        <View
                          style={[
                            styles.status,
                            { backgroundColor: statusStyle.backgroundColor },
                          ]}
                        >
                          <View style={[styles.statusDot, { backgroundColor: statusStyle.dot }]} />
                          <Text style={[styles.statusText, { color: statusStyle.color }]}>
                            {getStatusLabel(issue.status)}
                          </Text>
                        </View>
                        
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                          <Ionicons name="caret-up" size={14} color={colors.textSecondary} />
                          <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: "600" }}>
                            {issue.support_count}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* END OF LIST CTA */}
            {issues.length > 0 && (
              <View style={styles.endCtaContainer}>
                <View style={styles.endCtaIcon}>
                  <Ionicons name="flag" size={24} color="#6366F1" />
                </View>
                <Text style={styles.endCtaTitle}>Didn't find what you're looking for?</Text>
                <Text style={styles.endCtaSubtitle}>Help your community by reporting new issues.</Text>
                <Pressable
                  style={styles.endCtaButton}
                  onPress={() => router.push("/report")}
                >
                  <Text style={styles.endCtaButtonText}>Report issue</Text>
                </Pressable>
              </View>
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

function createStyles(colors: typeof Colors.light) {
  return StyleSheet.create({
    loading: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 64,
    },

    /* HEADER */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  headerLeft: {
    flex: 1,
  },
    greeting: {
      fontSize: 15,
      color: colors.textSecondary,
      fontWeight: "500",
      marginBottom: 6,
    },
    greetingName: {
      color: colors.text,
      fontWeight: "700",
    },
    locationContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    locationText: {
      fontSize: 13,
      color: colors.textSecondary,
      marginLeft: 4,
      fontWeight: "500",
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "600",
    },

    /* HERO / ACTIONS */
    heroSection: {
      marginBottom: 24,
    },
    heroSubtitle: {
      color: colors.textSecondary,
      fontSize: 14,
      marginBottom: 16,
    },
    actionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    primaryAction: {
      flex: 1,
      backgroundColor: colors.tint,
      borderRadius: 16,
      paddingVertical: 12,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-start",
      shadowColor: colors.tint,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 6,
    },
    primaryActionIcon: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: "#FFFFFF",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 10,
    },
    primaryActionText: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "700",
    },
    secondaryAction: {
      flex: 1,
      backgroundColor: colors.glass,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      paddingVertical: 12,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-start",
    },
    secondaryActionIcon: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: colors.glass,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 10,
    },
    secondaryActionText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "600",
    },

    /* COMPACT STATS */
    compactStats: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.card,
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 32,
      shadowColor: colors.tint,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
      elevation: 2,
    },
    compactStatItem: {
      alignItems: "center",
      flex: 1,
    },
    glassIcon: {
      width: 28,
      height: 28,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 6,
    },
    compactStatNumber: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "700",
      marginBottom: 2,
    },
    compactStatLabel: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: "500",
    },
    statDivider: {
      width: 1,
      height: 32,
      backgroundColor: colors.border,
    },

    /* SECTION HEADER */
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
    },
    mapLink: {
      flexDirection: "row",
      alignItems: "center",
    },
    mapLinkText: {
      color: colors.tint,
      fontSize: 14,
      fontWeight: "500",
      marginRight: 4,
    },

    /* SEARCH */
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      height: 48,
      marginBottom: 24,
    },
    searchIcon: {
      marginRight: 10,
    },
    searchInput: {
      flex: 1,
      color: colors.text,
      fontSize: 14,
    },

    /* ISSUE GRID */
    issueGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
    issueGridCard: {
      width: "48%",
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
      marginBottom: 16,
    },
    gridImageContainer: {
      width: "100%",
      height: 110,
      backgroundColor: colors.border,
    },
    issueImage: {
      width: "100%",
      height: "100%",
    },
    noImage: {
      width: "100%",
      height: "100%",
      backgroundColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    gridIssueContent: {
      padding: 12,
    },
    gridIssueTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "600",
      lineHeight: 20,
    },
    gridLocation: {
      color: colors.textSecondary,
      fontSize: 12,
      marginTop: 6,
      alignItems: "center",
    },
    gridIssueBottom: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 12,
    },
    status: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginRight: 6,
    },
    statusText: {
      fontSize: 10,
      fontWeight: "600",
    },

    /* EMPTY */
    emptyState: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 32,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    emptyIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: "rgba(74,222,128,0.12)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "600",
    },
    emptyText: {
      color: colors.textSecondary,
      fontSize: 13,
      marginTop: 4,
      textAlign: "center",
    },

    /* END CTA */
    endCtaContainer: {
      backgroundColor: colors.glass,
      borderRadius: 16,
      padding: 24,
      marginTop: 8,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
    },
    endCtaIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: "rgba(99,102,241,0.2)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    endCtaTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "600",
      textAlign: "center",
      marginBottom: 6,
    },
    endCtaSubtitle: {
      color: colors.textSecondary,
      fontSize: 13,
      textAlign: "center",
      marginBottom: 20,
    },
    endCtaButton: {
      backgroundColor: colors.tint,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 12,
    },
    endCtaButtonText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "600",
    },
  });
}