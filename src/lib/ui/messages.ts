export const UI_MESSAGES = {
  actions: {
    backToDashboard: "Kembali ke dashboard",
    clearFilters: "Hapus filter",
    createFirst: "Buat data pertama",
    retry: "Coba lagi",
    tryAgain: "Coba lagi",
  },
  states: {
    empty: {
      title: "Belum ada data",
      description: "Data akan muncul setelah tersedia atau setelah filter diubah.",
    },
    noResults: {
      title: "Data tidak ditemukan",
      description: "Tidak ada data yang sesuai dengan filter saat ini.",
    },
    offline: {
      title: "Anda sedang offline",
      description: "Sambungkan kembali perangkat untuk melanjutkan. Draf lokal tetap tersimpan, tetapi belum dikirim.",
    },
    error: {
      title: "Terjadi kesalahan",
      description: "Data belum dapat dimuat. Coba lagi atau kembali beberapa saat lagi.",
    },
    notFound: {
      title: "Data tidak ditemukan",
      description: "Halaman atau data yang Anda cari tidak tersedia atau sudah dipindahkan.",
    },
    unauthorized: {
      title: "Akses tidak tersedia",
      description: "Akun Anda tidak memiliki izin untuk membuka area ini.",
    },
    success: {
      title: "Berhasil disimpan",
      description: "Perubahan Anda sudah tersimpan.",
    },
  },
} as const;
