import { Image, ImageStyle, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { ImageOff } from "lucide-react-native";
import { useState } from "react";

import { colors } from "../theme";

type RemoteImageProps = {
  uri?: string | null;
  style: StyleProp<ImageStyle>;
  accessibilityLabel: string;
};

export function RemoteImage({ uri, style, accessibilityLabel }: RemoteImageProps) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const failed = !uri || failedUri === uri;

  if (failed) {
    return (
      <View
        accessible
        accessibilityLabel={`${accessibilityLabel} tidak tersedia`}
        style={[styles.placeholder, style as StyleProp<ViewStyle>]}
      >
        <ImageOff color={colors.textMuted} size={18} />
      </View>
    );
  }

  return (
    <Image
      alt={accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
      onError={() => setFailedUri(uri)}
      resizeMode="cover"
      source={{ uri }}
      style={style}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: "center",
    backgroundColor: "#F0F4FB",
    justifyContent: "center",
  },
});
