export const colors = {
  page: "#F7F8FA",
  surface: "#FFFFFF",
  surfaceMuted: "#F1F5F9",
  surfaceStrong: "#E8EEF7",
  primary: "#1454C4",
  primaryDark: "#123C9C",
  primarySoft: "#E7F0FF",
  finance: "#16834A",
  financeDark: "#137B4B",
  financeSoft: "#E7F7EE",
  text: "#142D60",
  textStrong: "#0F234D",
  textMuted: "#626D7C",
  textSubtle: "#667085",
  border: "#DFE4EC",
  borderStrong: "#C9D4E3",
  success: "#27834B",
  successSoft: "#E8F7EE",
  warning: "#A85B08",
  warningSoft: "#FFF3DF",
  danger: "#C5312C",
  dangerSoft: "#FDECEC",
  info: "#1976A8",
  infoSoft: "#E7F4FB",
  ink: "#0B1F3A",
  cardBlue: "#F1F6FF",
  cardGreen: "#F0FAF4",
  cardOrange: "#FFF8EA",
  cardRed: "#FFF4F3",
  cardGray: "#F7F8FA",
  cardBlueBorder: "#C9DCF8",
  cardGreenBorder: "#CBEAD5",
  cardOrangeBorder: "#F1D5A6",
  cardRedBorder: "#F3CBC8",
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 32 };

export const layout = { bottomNavContentInset: 84, minTouchTarget: 44 } as const;

export const typography = {
  display: 28,
  title: 22,
  section: 16,
  body: 14,
  caption: 12,
  micro: 10,
} as const;

export const radii = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 } as const;

export const shadows = {
  card: {
    shadowColor: "#0B1F3A",
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
} as const;

export const roleTheme = {
  PIMPINAN: { header: colors.primaryDark, accent: colors.primary, soft: colors.primarySoft, label: "PIMPINAN / ADMIN" },
  BENDAHARA: { header: colors.financeDark, accent: colors.finance, soft: colors.financeSoft, label: "BENDAHARA" },
  PETUGAS_LAPANGAN: { header: colors.primaryDark, accent: colors.primary, soft: colors.primarySoft, label: "PETUGAS LAPANGAN" },
} as const;

export type Role = keyof typeof roleTheme;
