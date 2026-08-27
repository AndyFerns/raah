import { useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
  Pressable,
  Alert,
  Image,
} from "react-native";
import { useEffect, useState } from "react";
import Colors from "@/constants/Colors";

import { supabase } from "@/lib/supabase";

export default function IssueDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isDark = useColorScheme() === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const styles = createStyles(colors);

  const [issue, setIssue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSupporting, setIsSupporting] = useState(false);

  async function supportIssue() {
    if (!issue) return;
    setIsSupporting(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      const user = authData.user;
      if (!user) {
        Alert.alert("Login required", "Please log in to support an issue.");
        return;
      }

      const { data: existingSupport, error: existingError } = await supabase
        .from("issue_supports")
        .select("issue_id")
        .eq("issue_id", issue.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existingSupport) {
        Alert.alert("Already supported", "You have already supported this issue.");
        return;
      }

      const { error } = await supabase
        .from("issue_supports")
        .insert({ issue_id: issue.id, user_id: user.id });

      if (error) throw error;

      setIssue((current: any) => ({
        ...current,
        support_count: current.support_count + 1,
      }));
      Alert.alert("Support added", "Your support has been added to this issue.");
    } catch (error: any) {
      console.error("Support error:", error);
      Alert.alert("Could not support issue", error?.message ?? "Please try again.");
    } finally {
      setIsSupporting(false);
    }
  }

  useEffect(() => {
    async function fetchIssue() {
      if (!id) return;

      const { data, error } = await supabase
        .from("issues")
        .select(`
          *,
          issue_media (
            id,
            storage_path,
            type
          )
        `)
        .eq("id", id)
        .single();

      if (error) {
        console.log("Error fetching issue:", error);
      }

      setIssue(data);
      setLoading(false);
    }

    fetchIssue();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  if (!issue) {
    return (
      <View style={styles.loading}>
        <Text style={styles.notFound}>Issue not found</Text>
      </View>
    );
  }

  const firstImage = issue.issue_media?.find((media: any) => media.type === "image");
  const imageUrl = firstImage 
    ? (firstImage.storage_path.startsWith("http") 
        ? firstImage.storage_path 
        : supabase.storage.from("issue-media").getPublicUrl(firstImage.storage_path).data.publicUrl)
    : null;

  return (
    <ScrollView style={styles.container}>
      {imageUrl && (
        <Image source={{ uri: imageUrl }} style={styles.heroImage} />
      )}
      <View style={styles.content}>
        <Text style={styles.category}>
          {issue.category?.replace("_", " ").toUpperCase()}
        </Text>

        <Text style={styles.title}>
          {issue.title}
        </Text>

        <Text style={styles.status}>
          {issue.status.replace("_", " ").toUpperCase()}
        </Text>

        <Text style={styles.description}>
          {issue.description}
        </Text>

        <Text style={styles.location}>
          📍 {issue.location_name || "Selected location"}
        </Text>

        <Pressable 
          style={[styles.supportButton, isSupporting && styles.supportButtonDisabled]}
          onPress={supportIssue}
          disabled={isSupporting}
        >
          {isSupporting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.supportButtonText}>
              ▲ Support this issue ({issue.support_count})
            </Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

function createStyles(colors: typeof Colors.light) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    heroImage: {
      width: "100%",
      height: 250,
      backgroundColor: colors.border,
    },

    content: {
      padding: 24,
      paddingTop: 30,
    },

    loading: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: "center",
      alignItems: "center",
    },

    category: {
      color: colors.success,
      fontSize: 14,
      fontWeight: "800",
      letterSpacing: 1,
      marginBottom: 12,
    },

    title: {
      color: colors.text,
      fontSize: 30,
      fontWeight: "800",
      lineHeight: 38,
      marginBottom: 16,
    },

    status: {
      alignSelf: "flex-start",
      backgroundColor: "rgba(239, 68, 68, 0.15)",
      color: colors.danger,
      fontSize: 13,
      fontWeight: "800",
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      marginBottom: 24,
    },

    description: {
      color: colors.textSecondary,
      fontSize: 17,
      lineHeight: 26,
      marginBottom: 24,
    },

    location: {
      color: colors.text,
      fontSize: 16,
      marginBottom: 20,
    },

    supportButton: {
      backgroundColor: colors.tint,
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 12,
      alignItems: "center",
      marginTop: 10,
    },

    supportButtonDisabled: {
      opacity: 0.7,
    },

    supportButtonText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "700",
    },

    notFound: {
      color: colors.text,
      fontSize: 18,
    },
  });
}