export const CHART_COLORS = {
  blue: "#2563eb",
  emerald: "#059669",
  amber: "#d97706",
  red: "#dc2626",
  cyan: "#0891b2",
  violet: "#7c3aed",
  orange: "#ea580c",
  green: "#16a34a",
  fuchsia: "#9333ea",
  slate: "#64748b",
  pink: "#db2777",
  teal: "#0d9488",
  lime: "#65a30d",
};

export const MAPEL_PALETTE: string[] = [
  CHART_COLORS.blue,
  CHART_COLORS.emerald,
  CHART_COLORS.amber,
  CHART_COLORS.red,
  CHART_COLORS.cyan,
  CHART_COLORS.violet,
  CHART_COLORS.orange,
  CHART_COLORS.green,
  CHART_COLORS.fuchsia,
  CHART_COLORS.slate,
  CHART_COLORS.pink,
  // Ditambahkan untuk Seni Budaya dan Prakarya. Tanpa ini, indeks warna
  // berputar memakai i % panjang sehingga mapel ke-12 dan ke-13 akan
  // memakai warna yang sama dengan mapel ke-1 dan ke-2.
  CHART_COLORS.teal,
  CHART_COLORS.lime,
];

export const KEHADIRAN_COLORS = {
  Sakit: CHART_COLORS.amber,
  Izin: CHART_COLORS.blue,
  Alpa: CHART_COLORS.red,
};

export const GENDER_COLORS = {
  "Laki-laki": CHART_COLORS.blue,
  Perempuan: CHART_COLORS.pink,
};
