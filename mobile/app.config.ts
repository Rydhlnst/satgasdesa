import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const productionApiUrl = "https://satgas.beres.io";
  const isProductionEasBuild = Boolean(process.env.EAS_BUILD && ["production-apk", "production"].includes(process.env.EAS_BUILD_PROFILE ?? ""));
  const apiUrl = isProductionEasBuild ? productionApiUrl : (process.env.EXPO_PUBLIC_API_URL?.trim() || productionApiUrl);
  const mapTilerApiKey = process.env.EXPO_PUBLIC_MAPTILER_API_KEY;

  if (process.env.EAS_BUILD) {
    try {
      const parsedApiUrl = new URL(apiUrl);
      if (parsedApiUrl.protocol !== "https:") throw new Error("HTTPS is required.");
    } catch {
      throw new Error("EXPO_PUBLIC_API_URL must be a valid HTTPS URL for EAS builds.");
    }
    if (isProductionEasBuild && apiUrl !== productionApiUrl) throw new Error("Production EAS builds must use https://satgas.beres.io.");
    if (!mapTilerApiKey) throw new Error("EXPO_PUBLIC_MAPTILER_API_KEY is required for EAS builds.");
  }

  return {
    ...config,
    android: { ...config.android, softwareKeyboardLayoutMode: "resize" },
    plugins: [
      ...(config.plugins ?? []),
      "@maplibre/maplibre-react-native",
      [
        "expo-build-properties",
        {
          android: {
            enableMinifyInReleaseBuilds: true,
            enableShrinkResourcesInReleaseBuilds: true,
            enableBundleCompression: true,
          },
        },
      ],
    ],
  } as ExpoConfig;
};
