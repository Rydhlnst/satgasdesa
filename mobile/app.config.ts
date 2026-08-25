import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  const mapTilerApiKey = process.env.EXPO_PUBLIC_MAPTILER_API_KEY;

  if (process.env.EAS_BUILD) {
    if (!apiUrl) throw new Error("EXPO_PUBLIC_API_URL is required for EAS builds.");
    try {
      const parsedApiUrl = new URL(apiUrl);
      if (parsedApiUrl.protocol !== "https:") throw new Error("HTTPS is required.");
    } catch {
      throw new Error("EXPO_PUBLIC_API_URL must be a valid HTTPS URL for EAS builds.");
    }
    if (!mapTilerApiKey) throw new Error("EXPO_PUBLIC_MAPTILER_API_KEY is required for EAS builds.");
  }

  return {
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      "@maplibre/maplibre-react-native",
    ],
  } as ExpoConfig;
};
