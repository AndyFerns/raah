import { View } from "react-native";
import { Stack, usePathname } from "expo-router";

import AppTabs from "@/components/app-tabs";

export default function AppLayout() {
  const pathname = usePathname();

  const hideTabs = pathname.startsWith("/issue/");

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />

      {!hideTabs && <AppTabs />}
    </View>
  );
}