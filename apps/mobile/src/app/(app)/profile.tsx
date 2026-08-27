import { useState, useCallback } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
  Alert,
  Image,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
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
  category: string;
  status: IssueStatus;
  created_at: string;
  issue_media?: {
    storage_path: string;
    type: string;
  }[];
};

export default function ProfileScreen() {
  const isDark = useColorScheme() === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const styles = createStyles(colors);

  const [loading, setLoading] = useState(true);
  const [issues, setIssues] = useState<DbIssue[]>([]);
  const [userEmail, setUserEmail] = useState<string>("");

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  async function loadProfile() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/login");
        return;
      }

      setUserEmail(session.user.email || "User");

      const { data, error } = await supabase
        .from("issues")
        .select(`
          id,
          title,
          category,
          status,
          created_at,
          issue_media (
            storage_path,
            type
          )
        `)
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.log("Error loading issues:", error);
      } else {
        setIssues(data as DbIssue[]);
      }
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert("Error signing out", error.message);
    }
  }

  function getIssueImage(issue: DbIssue) {
    const media = issue.issue_media?.find((item) => item.type === "image");
    if (!media?.storage_path) return null;

    if (media.storage_path.startsWith("http")) {
      return media.storage_path;
    }

    const { data } = supabase.storage
      .from("issue-media")
      .getPublicUrl(media.storage_path);

    return data.publicUrl;
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{userEmail.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.title}>Your Profile</Text>
          <Text style={styles.email}>{userEmail}</Text>
        </View>
        <Pressable onPress={handleSignOut} style={styles.signOutBtn}>
          <Ionicons name="log-out-outline" size={24} color={colors.danger} />
        </Pressable>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Your Reported Issues</Text>
        
        {loading && issues.length === 0 ? (
          <ActivityIndicator size="large" color={colors.tint} style={{ marginTop: 40 }} />
        ) : issues.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color={colors.border} />
            <Text style={styles.emptyText}>You haven't reported any issues yet.</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
            {issues.map((issue) => {
              const statusStyle = getStatusStyle(issue.status);
              const imageUri = getIssueImage(issue);
              return (
                <Pressable
                  key={issue.id}
                  style={styles.issueCard}
                  onPress={() => router.push(`/issue/${issue.id}` as any)}
                >
                  <View style={styles.cardImageContainer}>
                    {imageUri ? (
                      <Image source={{ uri: imageUri }} style={styles.cardImage} />
                    ) : (
                      <View style={styles.cardNoImage}>
                        <Ionicons name="image-outline" size={24} color={colors.tabIconDefault || "#9CA3AF"} />
                      </View>
                    )}
                  </View>
                  <View style={styles.issueInfo}>
                    <Text style={styles.issueTitle} numberOfLines={1}>{issue.title}</Text>
                    <Text style={styles.issueDate}>
                      {new Date(issue.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.backgroundColor }]}>
                    <View style={[styles.statusDot, { backgroundColor: statusStyle.dot }]} />
                    <Text style={[styles.statusText, { color: statusStyle.color }]}>
                      {getStatusLabel(issue.status)}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

function createStyles(colors: typeof Colors.light) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 24,
      paddingTop: 70,
      paddingBottom: 24,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.tint,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 16,
    },
    avatarText: {
      color: "#FFFFFF",
      fontSize: 24,
      fontWeight: "700",
    },
    userInfo: {
      flex: 1,
    },
    title: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.text,
    },
    email: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 2,
    },
    signOutBtn: {
      padding: 8,
      backgroundColor: "rgba(239, 68, 68, 0.1)",
      borderRadius: 12,
    },
    content: {
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 16,
    },
    list: {
      paddingBottom: 100,
    },
    issueCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.card,
      padding: 12,
      borderRadius: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardImageContainer: {
      width: 50,
      height: 50,
      borderRadius: 10,
      overflow: "hidden",
      marginRight: 12,
    },
    cardImage: {
      width: "100%",
      height: "100%",
    },
    cardNoImage: {
      width: "100%",
      height: "100%",
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
    },
    issueInfo: {
      flex: 1,
      marginRight: 8,
    },
    issueTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 4,
    },
    issueDate: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginRight: 6,
    },
    statusText: {
      fontSize: 12,
      fontWeight: "600",
    },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      marginTop: 60,
    },
    emptyText: {
      marginTop: 16,
      color: colors.textSecondary,
      fontSize: 15,
    },
  });
}