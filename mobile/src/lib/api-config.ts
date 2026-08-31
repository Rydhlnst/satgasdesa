export const PRODUCTION_API_URL = "https://satgas.beres.io";

export function resolveMobileApiUrl({ isProductionBuild, configuredApiUrl }: { isProductionBuild: boolean; configuredApiUrl?: string }) {
  const value = isProductionBuild ? PRODUCTION_API_URL : (configuredApiUrl?.trim() || PRODUCTION_API_URL);
  return value.replace(/\/+$/, "");
}
