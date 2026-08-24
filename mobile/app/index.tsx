import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "../src/auth";
import { colors } from "../src/theme";

export default function Index() {
  const { loading, session } = useAuth();
  if (loading) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.page }}><ActivityIndicator color={colors.primary} /></View>;
  return <Redirect href={session ? "/dashboard" : "/login"} />;
}
