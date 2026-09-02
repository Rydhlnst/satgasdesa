import type { ConfigContext, ExpoConfig } from "expo/config";

const PRODUCTION_API_URL = "https://satgas.beres.io";

export default ({ config }: ConfigContext): ExpoConfig => {
  const isProductionEasBuild = Boolean(process.env.EAS_BUILD && ["production-apk", "production"].includes(process.env.EAS_BUILD_PROFILE ?? ""));
  const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, "");
  const apiUrl = isProductionEasBuild ? PRODUCTION_API_URL : (configuredApiUrl || PRODUCTION_API_URL);
  const configuredMapTilerApiKey = process.env.EXPO_PUBLIC_MAPTILER_API_KEY?.trim();
  const fallbackMapTilerApiKey = typeof config.extra?.mapTilerApiKey === "string" ? config.extra.mapTilerApiKey.trim() : undefined;
  const mapTilerApiKey = configuredMapTilerApiKey || fallbackMapTilerApiKey;

  if (process.env.EAS_BUILD) {
    try {
      const parsedApiUrl = new URL(apiUrl);
      if (parsedApiUrl.protocol !== "https:") throw new Error("HTTPS is required.");
    } catch {
      throw new Error("EXPO_PUBLIC_API_URL must be a valid HTTPS URL for EAS builds.");
    }
    if (isProductionEasBuild && apiUrl !== PRODUCTION_API_URL) throw new Error("Production EAS builds must use https://satgas.beres.io.");
    if (!mapTilerApiKey) throw new Error("EXPO_PUBLIC_MAPTILER_API_KEY is required for EAS builds.");
  }

  return {
    ...config,
    extra: { ...(config.extra ?? {}), apiUrl, mapTilerApiKey },
    android: { ...config.android, softwareKeyboardLayoutMode: "resize" },
    updates: { ...(config.updates ?? {}), checkAutomatically: "ON_LOAD", fallbackToCacheTimeout: 0 },
    plugins: [
      ...(config.plugins ?? []),
      "expo-asset",
      "expo-font",
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
