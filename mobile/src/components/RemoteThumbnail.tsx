import { useQuery } from "@tanstack/react-query";
import { Image, StyleSheet, View } from "react-native";
import { ImageOff } from "lucide-react-native";

import { colors } from "../theme";

export function RemoteThumbnail({ queryKey, loadUrl, size = 52 }: { queryKey: string[]; loadUrl: () => Promise<string>; size?: number }) {
  const query = useQuery({ queryKey, queryFn: loadUrl, enabled: true, staleTime: 4 * 60 * 1000 });
  if (query.data) return <Image source={{ uri: query.data }} style={[styles.image, { height: size, width: size }]} />;
  return <View style={[styles.placeholder, { height: size, width: size }]}><ImageOff color={colors.textMuted} size={18} /></View>;
}

const styles = StyleSheet.create({ image: { borderRadius: 9 }, placeholder: { alignItems: "center", backgroundColor: "#F0F4FB", borderRadius: 9, justifyContent: "center" } });
