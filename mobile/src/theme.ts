export const colors = {
  page: "#F7F8FA",
  surface: "#FFFFFF",
  primary: "#1454C4",
  primaryDark: "#123C9C",
  finance: "#16834A",
  financeDark: "#137B4B",
  text: "#142D60",
  textMuted: "#6E7785",
  border: "#DFE4EC",
  success: "#27834B",
  warning: "#D87914",
  danger: "#C5312C",
};

export const spacing = { xs: 6, sm: 10, md: 14, lg: 18, xl: 24, xxl: 32 };

export const roleTheme = {
  PIMPINAN: { header: colors.primaryDark, accent: colors.primary, label: "PIMPINAN / ADMIN" },
  BENDAHARA: { header: colors.financeDark, accent: colors.finance, label: "BENDAHARA" },
  PETUGAS_LAPANGAN: { header: colors.primaryDark, accent: colors.primary, label: "PETUGAS LAPANGAN" },
} as const;

export type Role = keyof typeof roleTheme;
