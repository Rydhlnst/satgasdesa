Bisa. Saya trace **7 gambar satu per satu**, lalu saya normalisasi menjadi satu PRD supaya fitur yang muncul dengan nama berbeda tidak terduplikasi atau malah hilang. Ada beberapa modul yang hanya muncul sekilas—seperti **Data Pekerja, Tugas Saya, Informasi Saya/Dibalas, audit trail, dan Pengaturan**—dan itu tetap saya masukkan karena kalau dihilangkan implementasinya bakal punya dead-end.

# PRODUCT REQUIREMENTS DOCUMENT

## SATGAS DESA SEJOLI — Sistem Monitoring, Operasional, Keuangan & Pelaporan

**Versi:** 1.0
**Database:** MySQL 8+
**Platform:** Responsive Web Application — Mobile First + Desktop Dashboard
**Role utama:** Pimpinan/Admin, Bendahara, Petugas Lapangan

---

# 1. TUJUAN SISTEM

SATGAS Desa Sejoli merupakan aplikasi internal untuk mengelola:

1. Monitoring seluruh blok.
2. Lokasi blok berbasis GPS dan peta.
3. Pemeriksaan lapangan.
4. Excavator dan riwayat alat.
5. Pekerja per blok.
6. Informasi/kegiatan/keluhan/insiden lapangan.
7. Iuran bulanan.
8. Iuran jalan.
9. Pembayaran iuran.
10. Tunggakan.
11. Saldo kas.
12. Transaksi pemasukan.
13. Transaksi pengeluaran.
14. Alokasi anggaran.
15. Pengajuan dana.
16. Verifikasi dan pengesahan dana.
17. Realisasi penggunaan anggaran.
18. Laporan.
19. Export PDF/Excel.
20. Dashboard real-time.
21. Riwayat perubahan data.
22. Audit trail.
23. Notifikasi.
24. Manajemen akses berbasis role.

Sistem harus menjadi **single source of truth** sehingga data lapangan, data blok, excavator, keuangan, pengajuan, dan realisasi saling berhubungan dan tidak dibuat sebagai data terpisah yang tidak memiliki relasi.

---

# 2. HASIL TRACE GAMBAR SATU PER SATU

# GAMBAR 1 — AKSES PETUGAS LAPANGAN

## 2.1 Dashboard Petugas

Tampilan memperlihatkan:

### Header

* Logo SATGAS.
* Nama aplikasi.
* Role `PETUGAS LAPANGAN`.
* Hamburger/menu.
* Notification bell.
* Greeting.
* Nama petugas.
* Tanggal saat ini.

### Ringkasan Hari Ini

Card:

* Blok Tugas.
* Jumlah blok yang menjadi tanggung jawab.
* Pemeriksaan.
* Jumlah pemeriksaan.
* Excavator Aktif.
* Jumlah unit aktif.
* Info Harian.
* Jumlah kegiatan/informasi.

### Tugas Saya

Daftar pekerjaan petugas.

Contoh:

* Pemeriksaan Blok 03.
* Cek Excavator Blok 07.
* Informasi Harian.

Status tugas:

* Belum Dikerjakan.
* Proses.
* Selesai.

Tersedia:

* Lihat Semua.
* Input Data Baru.

### Bottom Navigation

* Dashboard.
* Pemeriksaan.
* Excavator.
* Informasi.
* Profil.

---

## 2.2 Monitoring Blok — Peta

Fitur:

* Search `Cari blok`.
* Filter.
* Peta interaktif.
* Marker blok.
* Nomor blok pada marker.
* Zoom in.
* Zoom out.
* Re-center/lokasi.
* Map control.
* Legenda status.

Status terlihat:

* Aktif.
* Berhenti Sementara.
* Belum Operasi.
* Prioritas.

Petugas harus dapat memilih marker dan masuk ke Detail Blok.

---

## 2.3 Pemeriksaan Blok

Informasi awal:

* Blok.
* Tanggal.
* Waktu.
* Lokasi GPS.

Form terlihat:

| Field              | Control                                     |
| ------------------ | ------------------------------------------- |
| Blok               | Select / readonly berdasarkan blok terpilih |
| Tanggal            | Date picker                                 |
| Waktu              | Time picker                                 |
| GPS                | Auto geolocation                            |
| Kondisi Blok       | Dropdown                                    |
| Jumlah Pekerja     | Number stepper +/-                          |
| Kondisi Jalan      | Dropdown                                    |
| Kondisi Lingkungan | Dropdown                                    |
| Catatan            | Textarea                                    |
| Foto Dokumentasi   | Camera / Gallery / Dropzone                 |

Aksi:

* Tambah Foto.
* Simpan Draft.
* Kirim Data.

---

## 2.4 Excavator per Blok

Summary:

* Total Excavator.
* Aktif.
* Rusak.
* Tidak Aktif.

Setiap excavator memperlihatkan:

* Kode alat.
* Merek.
* Model.
* Operator.
* Status.
* Jam operasional.
* Update terakhir.

Aksi:

* Detail excavator.
* Tambah Excavator.

---

## 2.5 Informasi Harian

Filter tab:

* Semua.
* Kegiatan.
* Keluhan.
* Pemberitahuan.

Setiap item:

* Jenis.
* Tanggal.
* Waktu.
* Judul.
* Lokasi.
* Foto.

Aksi:

* Buat Informasi Baru.

---

## 2.6 Draft & Sinkronisasi

Gambar secara eksplisit menunjukkan:

* Data dapat disimpan sebagai Draft.
* Data dapat dikirim online.
* Data dikirim ke sistem pusat.
* Data dapat dimonitor Pimpinan/Admin secara real-time.

Maka semua form lapangan harus mempunyai minimal:

`DRAFT → SUBMITTED`

---

# GAMBAR 2 — AKSES BENDAHARA

# 2.7 Dashboard Keuangan

Header:

* Role Bendahara.
* Periode aktif.
* Notification.

Card:

### Saldo Kas Aktual

* Saldo kas.
* Lihat Detail.

### Iuran Bulan Ini

* Total diterima.

### Tunggakan

* Nominal tunggakan.
* Jumlah blok yang menunggak.

### Alokasi Bulan Ini

* Total anggaran.
* Lihat Detail.

### Realisasi

* Total realisasi.
* Persentase serapan.

### Pengajuan Menunggu Verifikasi

* Jumlah pengajuan.
* Lihat daftar.

### Informasi Harian

* Jumlah keluhan baru.
* Lihat detail.

### Ringkasan Cepat

* Total blok aktif.
* Excavator aktif.
* Pekerja terdaftar.

---

# 2.8 Keuangan — Iuran

Tabs:

* Iuran Bulanan.
* Iuran Jalan.
* Transaksi Masuk.
* Transaksi Keluar.

Ringkasan:

* Total Kewajiban.
* Diterima.
* Tunggakan.

Visualisasi:

* Donut/chart diterima vs tunggakan.
* Persentase pembayaran.

Daftar Per Blok:

* Search blok.
* Filter.
* Blok.
* Kewajiban.
* Diterima.
* Tunggakan.
* Status.

Status pembayaran:

* Lunas.
* Tunggak / Belum Bayar.

---

# 2.9 Alokasi Anggaran

Filter:

* Periode.

Tabs:

* Ringkasan.
* Per Kategori.
* Riwayat.

Summary:

* Total Alokasi.
* Sudah Dialokasikan.
* Sisa Belum Dialokasikan.

Kategori yang terlihat:

### A. Pemeliharaan/Pembangunan Infrastruktur Desa

### B. Belanja untuk Keperluan Operasional SATGAS

### C. Belanja Tidak Terduga

### D. Dana Cadangan/Simpanan

Setiap kategori menampilkan:

* Nilai anggaran.
* Nilai penggunaan/alokasi.
* Persentase.
* Progress bar.

Aksi:

* Buat Alokasi Anggaran.

---

# 2.10 Pengajuan Dana

Filter:

* Periode.

Tabs/status:

* Semua.
* Draft.
* Diajukan.
* Diverifikasi.
* Sah.

Setiap item:

* Nomor pengajuan.
* Nama/keperluan.
* Nominal.
* Tanggal.
* Status.

Aksi:

* Buat Pengajuan Baru.

Workflow:

`DRAFT → DIAJUKAN → DIVERIFIKASI → SAH`

---

# 2.11 Realisasi & Laporan

Tabs:

* Realisasi.
* Laporan.

Summary:

* Total Realisasi.
* Serapan.
* Sisa Anggaran.

Rincian realisasi:

* Per kategori.
* Nominal.
* Persentase.
* Progress bar.

Menu laporan:

* Laporan Keuangan.
* Laporan Iuran.
* Laporan Realisasi.
* Laporan Pengajuan.

### Aturan penting

Data berstatus `SAH` tidak boleh sembarang diedit.

Setiap perubahan penting wajib memiliki:

* ID.
* Waktu.
* User.
* Jejak audit.

---

# GAMBAR 3 — FITUR PETA BLOK PIMPINAN/ADMIN

# 2.12 Peta Blok Overview

Menampilkan:

* Persebaran seluruh blok.
* Jumlah total blok.
* Search blok.
* Tombol List.
* Marker berbeda berdasarkan status.
* Map layer control.
* Current location/re-center.
* Zoom +/−.

Legend:

* Aktif.
* Berhenti.
* Belum Operasi.
* Prioritas.

---

# 2.13 Filter Peta

Filter:

* Status Blok.
* Pengelola.
* Jumlah Excavator.
* Prioritas.

Aksi:

* Terapkan Filter.

Legenda juga menunjukkan kemungkinan:

* Blok Lain / tidak ada data terbaru.

---

# 2.14 Detail Blok dari Peta

Header:

* Nomor blok.
* Status.
* Pengelola.

Tabs:

* Ringkasan.
* Excavator.
* Pemeriksaan.
* Informasi.

Data:

* Lokasi.
* Lihat di Peta.
* Koordinat.
* Luas Area.
* Tanggal Mulai Operasi.
* Jumlah Excavator Aktif.
* Jumlah Pekerja.
* Status terakhir.
* Tanggal/jam update terakhir.

Aksi:

* Lihat Detail Lengkap.

---

# 2.15 Ringkasan Blok

Filter periode.

Informasi:

* Excavator Aktif.
* Pekerja.
* Jam Operasional.
* Produksi.
* Status blok.

Status history/timeline:

* Aktif.
* Berhenti.
* Belum Operasi.

Dokumentasi terakhir:

* Gallery foto.
* Counter tambahan foto seperti `+12`.

---

# 2.16 Riwayat Blok

Tabs:

* Semua.
* Status.
* Excavator.
* Pemeriksaan.

Riwayat grouped berdasarkan bulan.

Event dapat berupa:

* Pemeriksaan lapangan.
* Penambahan excavator.
* Excavator keluar.
* Informasi harian.
* Perubahan status.

Setiap event:

* Tanggal.
* Waktu.
* Jenis aktivitas.
* User/petugas.
* Foto jika tersedia.

---

# GAMBAR 4 — FITUR LENGKAP PIMPINAN/ADMIN

# 2.17 Dashboard Utama

Ringkasan:

* Monitoring Blok.
* Iuran Bulan Ini.
* Saldo Kas.
* Alokasi Bulan Ini.
* Realisasi Bulan Ini.
* Informasi Harian.

Section:

* Perlu Perhatian.

Contoh alert:

* Blok mempunyai tunggakan.
* Pengajuan menunggu verifikasi.
* Insiden prioritas tinggi.

---

# 2.18 Peta Blok

Tab:

* Peta.
* Daftar.

Fitur sama dengan modul peta sebelumnya.

---

# 2.19 Daftar Blok

Fitur:

* Search.
* Filter.
* Daftar blok.

Setiap row:

* Nomor/nama blok.
* Pengelola.
* Jumlah excavator.
* Status.
* Detail.

---

# 2.20 Detail Blok

Tabs:

* Ringkasan.
* Excavator.
* Pemeriksaan.
* Histori.

Informasi Blok:

* ID Blok.
* Nama Blok.
* Pengelola.
* PJ Lokasi.
* PJ Lapangan.
* Koordinat.
* Lihat di Peta.
* Status.
* Tanggal Mulai.

Ringkasan Operasional:

* Excavator Aktif.
* Jumlah Pekerja.
* Kondisi.

Dokumentasi:

* Foto Lokasi Terakhir.
* Lihat Semua.

---

# 2.21 Excavator per Blok

Daftar excavator aktif:

* Kode.
* Merek.
* Model.
* Operator.
* Tanggal masuk.
* Status.

Histori excavator:

* Excavator keluar.
* Tanggal keluar.

Aksi:

* Tambah Excavator.

---

# 2.22 Pemeriksaan Blok

Tabs:

* Ringkasan.
* Riwayat.

Pemeriksaan terakhir:

* Tanggal.
* Jam.
* Petugas pemeriksa.

Data:

* Jumlah Excavator.
* Jumlah Pekerja.
* Kondisi kegiatan/jalan.
* Temuan.
* Foto Dokumentasi.

Aksi:

* Buat Pemeriksaan Baru.

---

# 2.23 Iuran Bulanan

Tabs:

* Ringkasan.
* Daftar Pembayaran.
* Tunggakan.

Summary:

* Total Kewajiban.
* Diterima.
* Tunggakan.
* Donut chart.

---

# 2.24 Daftar Pembayaran

* Search.
* Filter.
* Tanggal pembayaran.
* Pengelola.
* Blok.
* Nominal.
* Status.

Status:

* Lunas.
* Belum Bayar.

---

# 2.25 Anggaran/Alokasi

Tabs:

* Ringkasan.
* Per Kategori.

Data:

* Total alokasi.
* Sudah dialokasikan.
* Sisa.
* Rincian kategori.
* Persentase.

Aksi:

* Buat Pengajuan Alokasi.

---

# 2.26 Pengajuan Dana

Tabs:

* Semua.
* Draft.
* Diajukan.
* Diverifikasi.
* Sah.

Aksi:

* Buat Pengajuan Baru.

---

# GAMBAR 5 — AKSES PIMPINAN/ADMIN

# 2.27 Dashboard Utama

Filter:

* Periode.

Card:

* Monitoring Blok.
* Iuran Bulan Ini.
* Saldo Kas.
* Alokasi Bulan Ini.
* Realisasi Bulan Ini.
* Informasi Harian.

Section `Perlu Perhatian`:

* Blok dengan tunggakan iuran.
* Pengajuan dana menunggu verifikasi.
* Insiden prioritas tinggi.

Section:

* Ringkasan Iuran Bulan Ini.
* Donut total iuran.
* Diterima.
* Tunggakan.

---

# 2.28 Monitoring Blok

Tabs:

* Daftar Blok.
* Peta.
* Excavator.
* Pemeriksaan.

Fitur:

* Search.
* Filter.

Row blok:

* Nama blok.
* Status.
* Jumlah excavator.
* Pengelola.

Aksi:

* Tambah Blok.

---

# 2.29 Keuangan

Tabs:

* Iuran Bulanan.
* Iuran Jalan.
* Pembayaran.
* Tunggakan.

Filter:

* Periode.
* Filter tambahan.

Summary:

* Total Kewajiban.
* Diterima.
* Tunggakan.

Daftar pembayaran:

* Blok.
* Pengelola.
* Nominal.
* Tanggal.
* Status.

---

# 2.30 Anggaran/Alokasi

Tabs:

* Ringkasan.
* Alokasi.
* Pengajuan.

Data:

* Total Alokasi.
* Sudah Dialokasikan.
* Sisa Belum Dialokasikan.
* Rincian per kategori.

---

# 2.31 Realisasi & Laporan

Tabs:

* Realisasi Penggunaan Dana.
* Laporan.

Filter:

* Periode.
* Filter.

Data:

* Total Realisasi.
* Serapan.
* Sisa.
* Realisasi per kategori.

---

# GAMBAR 6 — PERBANDINGAN SEMUA ROLE

Ini penting karena beberapa fitur hanya terlihat pada gambar ini.

---

# 2.32 Pimpinan/Admin

Memiliki:

* Dashboard.
* Monitoring Blok.
* Detail Blok.
* Keuangan/Iuran.
* Anggaran/Alokasi.
* Realisasi.

Detail blok memperlihatkan tabs lebih lengkap:

* Identitas.
* Operasional.
* Excavator.
* Pemeriksaan.
* Histori.

Identitas blok mencakup:

* ID blok.
* Nama.
* Pengelola.
* PJ lokasi.
* PJ lapangan.
* Koordinat.
* Status.
* Luas area.
* Keterangan/deskripsi.
* Foto lokasi.
* Map preview.

---

# 2.33 Bendahara — Dashboard

Dashboard khusus Bendahara:

* Saldo Kas.
* Iuran Diterima.
* Alokasi Bulan Ini.
* Realisasi Bulan Ini.
* Pengajuan Menunggu.
* Tunggakan Iuran.

Aktivitas Terbaru:

* Pengajuan baru.
* Pembayaran iuran.
* Realisasi penggunaan dana.

---

# 2.34 Bendahara — Keuangan

Tabs terlihat menggunakan variasi nama:

* Iuran Bulanan.
* Iuran Jalan.
* Dana Masuk.
* Dana Keluar.

Ini dinormalisasi dengan:

* Transaksi Masuk = Dana Masuk.
* Transaksi Keluar = Dana Keluar.

---

# 2.35 Bendahara — Detail Pengajuan

Field yang terlihat eksplisit:

* No. Pengajuan.
* Tanggal.
* Kategori.
* Sub Kategori.
* Uraian.
* Jumlah.
* Lampiran.
* Status.

Aksi:

* Ubah.
* Batalkan.

Ubah hanya diperbolehkan sebelum status final.

---

# 2.36 Petugas — Beranda Lapangan

Quick menu terlihat:

* Monitoring Blok.
* Pemeriksaan.
* Excavator.
* Pekerja.
* Informasi Harian.
* Kirim Informasi.

Terdapat:

* Aktivitas Terakhir.
* Lihat Semua.

### Catatan penting

`Pekerja / Data Pekerja` hanya muncul secara eksplisit pada gambar ini, tetapi tetap harus dibangun. Jangan menghilangkan menu tersebut hanya karena screen detail tidak tersedia dalam mockup.

---

# 2.37 Petugas — Daftar Pemeriksaan Blok

Fitur:

* Search blok.
* Filter.
* Filter/tab status.

Status:

* Aktif.
* Berhenti.
* Belum Operasi.

Daftar:

* Blok.
* Pengelola.
* Status.
* Excavator.
* Update terakhir.

---

# 2.38 Petugas — Input Pemeriksaan Multi Step

Stepper:

1. Data.
2. Foto.
3. Selesai.

Data:

* Blok.
* Tanggal.
* Waktu.
* Lokasi/GPS.
* Ambil Lokasi.
* Kondisi Blok.
* Jumlah Pekerja.
* Keterangan.

Aksi:

* Selanjutnya.

Step Foto:

* Open Camera.
* Upload Gallery.
* Dropzone.
* Preview.
* Delete/replace.

Step Selesai:

* Review data.
* Simpan Draft.
* Kirim.

---

# 2.39 Petugas — Excavator

Tabs:

* Unit Aktif.
* Riwayat.

Data:

* Kode unit.
* Merek.
* Model.
* Operator.
* Tanggal masuk.

Aksi:

* Tambah Excavator.

---

# 2.40 Petugas — Kirim Informasi

Jenis informasi menggunakan radio/select:

* Keluhan.
* Insiden.
* Pemberitahuan.
* Informasi.

Field:

* Judul.
* Uraian.
* Foto opsional.

Aksi:

* Kirim Informasi.

---

# 2.41 Informasi Saya

Tabs:

* Dikirim.
* Dibalas.

Setiap informasi mempunyai kemungkinan:

* Belum dibalas.
* Dibalas.

Maka modul informasi harus mendukung reply dari Admin/Pimpinan.

---

# GAMBAR 7 — VERSI KONSOLIDASI SISTEM

# 2.42 Dashboard Utama

Header:

* Greeting.
* Tanggal.
* Notification.
* Profile/avatar.

Card:

* Total Blok.
* Iuran Diterima.
* Persentase iuran.
* Saldo Kas.
* Alokasi.
* Realisasi.
* Persentase serapan.
* Informasi baru.
* Informasi mendesak.

Perlu Perhatian:

* Tunggakan iuran.
* Pengajuan menunggu verifikasi.
* Insiden hari ini.

Grafik:

* Pemasukan.
* Pengeluaran.
* Mingguan.
* Filter bulan.

---

# 2.43 Monitoring Blok

Filter tab:

* Semua.
* Aktif.
* Berhenti.

Card:

* Foto blok.
* Nama blok.
* Status.
* Jumlah excavator.
* Lokasi.

Aksi:

* Tambah Pemeriksaan.

---

# 2.44 Detail Blok

Tabs:

* Ringkasan.
* Excavator.
* Riwayat.

Data:

* Foto.
* Status.
* Pengelola.
* PJ lokasi.
* Nomor kontak PJ.
* Jumlah pekerja.
* Excavator aktif.
* Tanggal mulai operasi.
* GPS.

Aksi:

* Foto Lokasi.
* Lihat Peta.
* Call PJ lokasi jika nomor tersedia.

---

# 2.45 Excavator per Unit

Setiap item:

* Kode.
* Merek/model.
* Operator.
* Tanggal masuk.
* Status.

Aksi:

* Tambah Excavator.

---

# 2.46 Keuangan/Iuran

Tabs:

* Iuran Bulanan.
* Iuran Jalan.

Summary:

* Kewajiban.
* Diterima.
* Tunggakan.

Daftar Pembayaran:

* Pengelola.
* Blok.
* Jumlah unit.
* Nominal.
* Tanggal.
* Status.

Filter:

* Semua/status.

Aksi:

* Catat Pembayaran.

---

# 2.47 Alokasi Anggaran

Tampilan:

* Donut chart.
* Total Alokasi.

Kategori dalam versi gambar ini:

* Infrastruktur.
* Operasional.
* Ketertiban.
* Cadangan.

Aksi:

* Ajukan Alokasi Bulan Depan.

Karena mockup menggunakan dua nomenklatur kategori, kategori **tidak boleh di-hardcode** ke source code.

Kategori anggaran harus disimpan dalam tabel database sehingga Admin dapat mengatur kategori.

---

# 2.48 Realisasi Penggunaan Dana

Summary:

* Total Alokasi.
* Realisasi.
* Sisa.
* Persentase serapan.

Tabs:

* Per Kategori.
* Per Kegiatan.

Setiap kategori:

* Nama.
* Nominal.
* Progress.
* Persentase.

Aksi:

* Lihat Detail Pengeluaran.

---

# 2.49 Informasi Harian

Tabs:

* Semua.
* Keluhan.
* Insiden.
* Lainnya.

Item dapat mempunyai badge:

* Baru.
* Mendesak.

Data:

* Judul.
* Blok/lokasi.
* Tanggal.
* Waktu.
* Foto.
* Prioritas.

Aksi:

* Buat Informasi.

---

# 2.50 Pengajuan & Verifikasi

Tabs:

* Draft.
* Diajukan.
* Diverifikasi.
* Sah bila diperlukan.

Item:

* Uraian.
* Nominal.
* Tanggal.
* Status.

Aksi:

* Buat Pengajuan.

---

# 2.51 Laporan & Rekap

Filter:

* Periode.

Jenis laporan:

* Laporan Keuangan Bulanan.
* Laporan Iuran.
* Laporan Blok.
* Laporan Realisasi.
* Laporan Informasi.

Aksi:

* Export PDF.
* Export Excel.

---

# 2.52 Peta & Lokasi Blok

* Interactive map.
* Marker setiap blok.
* Zoom.
* Status berdasarkan warna.
* Legend.

Status:

* Aktif.
* Berhenti.
* Belum Operasi.
* Prioritas.

---

# 2.53 Desktop Dashboard

Sidebar:

* Dashboard.
* Monitoring Blok.
* Keuangan.
* Alokasi Anggaran.
* Realisasi.
* Informasi Harian.
* Laporan.
* Pengaturan.

Dashboard desktop:

* Total blok.
* Iuran.
* Saldo kas.
* Alokasi.
* Realisasi.
* Grafik Pemasukan vs Pengeluaran.
* Informasi terbaru.
* Ringkasan Keuangan Bulan Ini.
* Alokasi vs Realisasi.

---

# 3. NORMALISASI MODUL FINAL

Setelah seluruh gambar digabungkan, aplikasi harus mempunyai modul:

1. Authentication & RBAC.
2. Dashboard.
3. Tugas Petugas.
4. Monitoring Blok.
5. Peta Blok.
6. Detail Blok.
7. Histori Blok.
8. Pemeriksaan Blok.
9. Dokumentasi Blok.
10. Excavator.
11. Histori Excavator.
12. Pekerja.
13. Informasi Harian.
14. Reply Informasi.
15. Keuangan.
16. Iuran Bulanan.
17. Iuran Jalan.
18. Pembayaran.
19. Tunggakan.
20. Transaksi Masuk.
21. Transaksi Keluar.
22. Saldo Kas.
23. Anggaran.
24. Kategori Anggaran.
25. Alokasi Anggaran.
26. Pengajuan Dana.
27. Verifikasi Pengajuan.
28. Pengesahan Pengajuan.
29. Realisasi.
30. Laporan.
31. Export.
32. Notification.
33. Audit Trail.
34. Profile.
35. Pengaturan.

---

# 4. ROLE & PERMISSION

## 4.1 Pimpinan/Admin

Akses penuh untuk monitoring dan pengambilan keputusan.

### Dashboard

* View seluruh statistik.
* View alert.
* View chart.
* Filter periode.

### Blok

* View.
* Create.
* Edit.
* Arsipkan.
* Detail.
* Peta.
* Histori.

### Pemeriksaan

* View seluruh pemeriksaan.
* Buat pemeriksaan.
* Lihat foto.
* Lihat petugas.
* Filter histori.

### Excavator

* View.
* Tambah.
* Edit.
* Update status.
* Catat keluar.
* View history.

### Pekerja

* View seluruh pekerja.
* Tambah/edit jika diperlukan.

### Informasi

* View semua.
* Filter.
* Reply.
* Tandai selesai.
* Tandai prioritas.

### Keuangan

* View seluruh data.
* View transaksi.
* View tunggakan.
* View saldo kas.

### Anggaran

* View.
* Create/edit sesuai permission.

### Pengajuan

* View.
* Verifikasi.
* Tolak/kembalikan.
* Sahkan.

### Realisasi

* View.
* Review.

### Laporan

* Semua laporan.
* Export PDF.
* Export Excel.

### Administration

* User management.
* Role.
* Master data.
* Settings.
* Audit logs.

---

# 4.2 Bendahara

Fokus:

* Keuangan.
* Anggaran.
* Pengajuan.
* Realisasi.
* Laporan keuangan.

Bendahara dapat:

* View dashboard Bendahara.
* View ringkasan operasional.
* Kelola iuran.
* Kelola iuran jalan.
* Catat pembayaran.
* Kelola transaksi masuk.
* Kelola transaksi keluar.
* View/update saldo.
* Kelola alokasi.
* Membuat pengajuan.
* Edit pengajuan Draft.
* Batalkan Draft/Diajukan sesuai aturan.
* Mencatat realisasi.
* Upload bukti realisasi.
* Generate laporan.
* Export.

Bendahara **tidak boleh mengubah transaksi atau pengajuan yang sudah `SAH` tanpa prosedur koreksi khusus**.

---

# 4.3 Petugas Lapangan

Petugas dapat:

* Dashboard lapangan.
* View blok yang diberikan kepadanya.
* View peta.
* View detail blok.
* Input pemeriksaan.
* Simpan pemeriksaan draft.
* Kirim pemeriksaan.
* Upload dokumentasi.
* Open Camera.
* Capture GPS.
* View excavator.
* Tambah/update excavator bila diberi izin.
* Input data pekerja.
* Kirim informasi.
* View informasi sendiri.
* View reply Admin.
* View tugas.
* Update status tugas.
* Profile.

Petugas tidak mempunyai akses ke:

* Saldo kas.
* Iuran global.
* Transaksi keuangan.
* Pengajuan dana organisasi.
* Alokasi organisasi.
* Realisasi global.
* Audit trail global.
* User management.

---

# 5. AUTHENTICATION

Minimum:

## Login

Field:

| Field            | Component      |
| ---------------- | -------------- |
| Email / Username | Text input     |
| Password         | Password input |
| Remember Me      | Checkbox       |

Fitur:

* Login.
* Logout.
* Forgot Password.
* Reset Password.
* Session management.
* Role based redirect.
* Inactive account blocking.

Setelah login:

* Pimpinan/Admin → Dashboard Admin.
* Bendahara → Dashboard Bendahara.
* Petugas → Dashboard Petugas.

---

# 6. DASHBOARD PIMPINAN / ADMIN

## KPI

* Total Blok.
* Blok Aktif.
* Blok Berhenti.
* Blok Belum Operasi.
* Blok Prioritas.
* Iuran Bulan Ini.
* Persentase Iuran.
* Total Tunggakan.
* Saldo Kas.
* Total Alokasi.
* Total Realisasi.
* Persentase Serapan.
* Excavator Aktif.
* Excavator Rusak.
* Jumlah Pekerja.
* Informasi Baru.
* Insiden Mendesak.
* Pengajuan Menunggu Verifikasi.

## Perlu Perhatian

Auto-generated berdasarkan:

* Tunggakan.
* Pengajuan pending.
* Insiden high priority.
* Excavator rusak.
* Blok berhenti.
* Pemeriksaan overdue.

## Grafik

### Pemasukan vs Pengeluaran

* Harian.
* Mingguan.
* Bulanan.
* Filter periode.

### Iuran

* Diterima.
* Tunggakan.

### Anggaran

* Total.
* Realisasi.
* Sisa.

---

# 7. DASHBOARD BENDAHARA

Card:

* Saldo Kas.
* Iuran Diterima.
* Tunggakan.
* Alokasi.
* Realisasi.
* Pengajuan Pending.

Aktivitas terbaru:

* Pembayaran.
* Pengajuan dana.
* Verifikasi.
* Realisasi.
* Transaksi masuk.
* Transaksi keluar.

---

# 8. DASHBOARD PETUGAS

## Ringkasan Hari Ini

* Blok Tugas.
* Pemeriksaan.
* Excavator Aktif.
* Info Harian.

## Quick Action

* Monitoring Blok.
* Pemeriksaan.
* Excavator.
* Pekerja.
* Informasi Harian.
* Kirim Informasi.

## Tugas Saya

Status:

`TODO → IN_PROGRESS → DONE`

---

# 9. MODUL BLOK

## 9.1 Daftar Blok

Fitur:

* Search.
* Filter.
* Sorting.
* Pagination.
* Tabs status.
* Add Block.
* Detail Block.

Filter:

* Status.
* Pengelola.
* Excavator count.
* Prioritas.

---

# 9.2 FORM TAMBAH/EDIT BLOK

| Field                 | Input Type              | Required |
| --------------------- | ----------------------- | -------: |
| Kode Blok             | Text                    |       Ya |
| Nama Blok             | Text                    |       Ya |
| Pengelola             | Text / Select           |       Ya |
| PJ Lokasi             | Select user/contact     |    Tidak |
| PJ Lapangan           | Select user/contact     |    Tidak |
| Nomor Kontak          | Tel input               |    Tidak |
| Status Operasional    | Dropdown                |       Ya |
| Prioritas             | Dropdown                |       Ya |
| Luas Area             | Decimal number          |    Tidak |
| Satuan Luas           | Dropdown                |    Tidak |
| Tanggal Mulai Operasi | Date                    |    Tidak |
| Lokasi/Alamat         | Textarea                |    Tidak |
| RT / Area             | Text                    |    Tidak |
| Latitude              | Decimal / automatic     |       Ya |
| Longitude             | Decimal / automatic     |       Ya |
| Ambil Lokasi Saya     | Geolocation Button      |        - |
| Pilih dari Peta       | Interactive map picker  |        - |
| Keterangan            | Textarea                |    Tidak |
| Foto Lokasi           | Camera/Gallery/Dropzone |    Tidak |

Status operasional:

* ACTIVE.
* TEMPORARY_STOPPED.
* STOPPED.
* NOT_STARTED.

Prioritas terpisah:

* NORMAL.
* PRIORITY.
* HIGH.

**Prioritas jangan dijadikan status operasional database**, karena sebuah blok secara logika dapat `ACTIVE` sekaligus `HIGH PRIORITY`.

---

# 10. PETA BLOK

Fitur:

* Marker.
* Marker clustering jika jumlah blok bertambah.
* Search.
* Filter.
* Zoom.
* Pan.
* Current location.
* Fit all markers.
* Layer control.
* Popup marker.
* Navigate ke detail.

Popup:

* Blok.
* Status.
* Pengelola.
* Excavator.
* Pekerja.
* Update terakhir.

---

# 11. DETAIL BLOK

Tabs final:

1. Ringkasan.
2. Identitas.
3. Operasional.
4. Excavator.
5. Pekerja.
6. Pemeriksaan.
7. Informasi.
8. Dokumentasi.
9. Riwayat.

---

# 12. PEMERIKSAAN BLOK

## Workflow

`DRAFT → SUBMITTED`

Form dibuat multi-step:

### Step 1 — Data

| Field              | Control             |
| ------------------ | ------------------- |
| Blok               | Searchable dropdown |
| Tanggal            | Date picker         |
| Waktu              | Time picker         |
| Lokasi GPS         | Auto geolocation    |
| Ambil Lokasi       | Button              |
| Kondisi Blok       | Dropdown            |
| Jumlah Excavator   | Number              |
| Jumlah Pekerja     | Number stepper      |
| Kondisi Jalan      | Dropdown            |
| Kondisi Lingkungan | Dropdown            |
| Kondisi Kegiatan   | Dropdown            |
| Temuan             | Textarea            |
| Catatan            | Textarea            |

### Kondisi Blok

* Aktif.
* Berhenti.
* Belum Operasi.

### Kondisi Jalan

Contoh:

* Baik.
* Cukup.
* Rusak.
* Tidak Bisa Dilalui.

### Kondisi Lingkungan

* Aman.
* Perlu Perhatian.
* Tidak Aman.

---

## Step 2 — Dokumentasi

Input:

* Open Camera.
* Upload Gallery.
* Drag & Drop desktop.
* Multiple image upload.
* Preview.
* Remove.
* Replace.

Minimum recommendation:

* 1 foto.

Maximum configurable:

* 5–10 foto per pemeriksaan.

Data foto:

* Original filename.
* Storage path.
* MIME type.
* File size.
* Latitude opsional.
* Longitude opsional.
* Captured at.

---

## Step 3 — Review

Tampilkan seluruh input sebelum submit.

Aksi:

* Kembali.
* Simpan Draft.
* Kirim Data.

---

# 13. EXCAVATOR

## Daftar

Filter:

* Blok.
* Status.
* Merek/model.
* Operator.

Status:

* ACTIVE.
* DAMAGED.
* INACTIVE.
* EXITED.

---

# 13.1 FORM EXCAVATOR

| Field             | Type                    |
| ----------------- | ----------------------- |
| Blok              | Searchable dropdown     |
| Kode Excavator    | Text                    |
| Merek             | Text/Select             |
| Model             | Text                    |
| Nomor Unit/Serial | Text                    |
| Operator          | Text/Select             |
| Status            | Dropdown                |
| Tanggal Masuk     | Date                    |
| Jam Operasional   | Decimal number          |
| Kondisi           | Dropdown                |
| Catatan           | Textarea                |
| Foto              | Camera/Gallery/Dropzone |

---

# 13.2 UPDATE EXCAVATOR

Form:

* Status.
* Operator.
* Jam meter.
* Kondisi.
* Catatan.
* Foto.
* Tanggal update.

Jika keluar:

* Tanggal Keluar.
* Alasan Keluar.
* Catatan.

Semua perpindahan harus menghasilkan histori.

---

# 14. DATA PEKERJA

Karena menu `Pekerja / Data Pekerja` terlihat pada mockup, modul ini wajib ada.

## Daftar

* Nama.
* Blok.
* Posisi.
* Status.
* Tanggal mulai.

## Form

| Field          | Type           |
| -------------- | -------------- |
| Nama           | Text           |
| Blok           | Select         |
| Posisi/Jabatan | Text/Select    |
| Nomor HP       | Tel            |
| Tanggal Mulai  | Date           |
| Status         | Dropdown       |
| Catatan        | Textarea       |
| Foto           | Camera/Gallery |

Status:

* ACTIVE.
* INACTIVE.

---

# 15. INFORMASI HARIAN

Jenis informasi dinormalisasi menjadi:

* ACTIVITY / Kegiatan.
* COMPLAINT / Keluhan.
* INCIDENT / Insiden.
* NOTICE / Pemberitahuan.
* INFORMATION / Informasi Lainnya.

---

# 15.1 FORM INFORMASI

| Field           | Control                      |
| --------------- | ---------------------------- |
| Jenis           | Radio Card / Dropdown        |
| Blok            | Searchable Select / Optional |
| Judul           | Text                         |
| Uraian          | Textarea                     |
| Lokasi          | Text                         |
| GPS             | Geolocation                  |
| Prioritas       | Dropdown                     |
| Foto            | Camera/Gallery/Dropzone      |
| Tanggal & Waktu | Automatic                    |

Prioritas:

* NORMAL.
* IMPORTANT.
* URGENT.

Aksi:

* Simpan Draft.
* Kirim Informasi.

---

# 15.2 INFORMASI SAYA

Tabs:

* Dikirim.
* Dibalas.

Status:

* SENT.
* READ.
* RESPONDED.
* RESOLVED.

Admin/Pimpinan dapat reply.

Petugas menerima notification jika informasi dibalas.

---

# 16. KEUANGAN

Navigation final:

1. Ringkasan.
2. Iuran Bulanan.
3. Iuran Jalan.
4. Pembayaran.
5. Tunggakan.
6. Transaksi Masuk.
7. Transaksi Keluar.

---

# 17. IURAN BULANAN

Setiap periode menghasilkan kewajiban per blok.

Data:

* Periode.
* Blok.
* Pengelola.
* Nilai kewajiban.
* Diterima.
* Tunggakan.
* Status.

Status:

* UNPAID.
* PARTIAL.
* PAID.
* OVERDUE.

---

# 17.1 FORM GENERATE IURAN

| Field       | Type                 |
| ----------- | -------------------- |
| Periode     | Month picker         |
| Blok        | Multi select / Semua |
| Jenis Iuran | Dropdown             |
| Nominal     | Currency             |
| Jatuh Tempo | Date                 |
| Catatan     | Textarea             |

Aksi:

* Generate.

Harus mencegah duplicate kewajiban untuk kombinasi:

`block + period + due_type`

---

# 18. IURAN JALAN

Struktur sama dengan Iuran Bulanan, tetapi:

`due_type = ROAD`

Nominal dapat berbeda dari iuran bulanan.

---

# 19. CATAT PEMBAYARAN

## Form Pembayaran

| Field              | Type              |
| ------------------ | ----------------- |
| Blok/Pengelola     | Search            |
| Kewajiban Iuran    | Select            |
| Tanggal Pembayaran | Date              |
| Nominal            | Currency          |
| Metode Pembayaran  | Dropdown          |
| Nomor Referensi    | Text              |
| Catatan            | Textarea          |
| Bukti Pembayaran   | Dropzone / Camera |

Metode:

* CASH.
* TRANSFER.
* QRIS.
* OTHER.

Setelah pembayaran:

`amount_paid = SUM(payment)`

Status kewajiban otomatis:

* `0` → UNPAID.
* `< amount_due` → PARTIAL.
* `>= amount_due` → PAID.

---

# 20. TRANSAKSI KAS

## Transaksi Masuk

Form:

* Tanggal.
* Kategori.
* Nominal.
* Sumber.
* Deskripsi.
* Lampiran.

## Transaksi Keluar

Form sama:

* Tanggal.
* Kategori.
* Nominal.
* Tujuan.
* Deskripsi.
* Lampiran.

Saldo kas **jangan diedit manual sebagai angka bebas**.

Saldo harus dihitung:

`opening balance + transaksi masuk - transaksi keluar`

---

# 21. ALOKASI ANGGARAN

Kategori tidak di-hardcode.

Admin dapat memiliki master kategori:

* Infrastruktur.
* Operasional.
* Ketertiban.
* Sosial & Masyarakat.
* Belanja Tidak Terduga.
* Cadangan.
* Kategori lain.

---

# 21.1 FORM KATEGORI ANGGARAN

* Kode.
* Nama.
* Deskripsi.
* Warna/Icon.
* Status aktif.

---

# 21.2 FORM ALOKASI

| Field        | Type         |
| ------------ | ------------ |
| Periode      | Month picker |
| Kategori     | Dropdown     |
| Sub Kategori | Dropdown     |
| Nominal      | Currency     |
| Keterangan   | Textarea     |
| Lampiran     | Dropzone     |

Validasi:

`SUM(alokasi kategori) <= total anggaran periode`

---

# 22. PENGAJUAN DANA

Workflow final:

`DRAFT → SUBMITTED → VERIFIED → APPROVED/SAH`

Tambahkan jalur exception:

`SUBMITTED → REJECTED`

`SUBMITTED → REVISION_REQUIRED`

`VERIFIED → REVISION_REQUIRED`

---

# 22.1 FORM PENGAJUAN DANA

Field dari mockup + kebutuhan workflow:

| Field           | Type              |
| --------------- | ----------------- |
| No Pengajuan    | Auto generated    |
| Periode         | Month             |
| Tanggal         | Date              |
| Kategori        | Dropdown          |
| Sub Kategori    | Dropdown          |
| Blok            | Select / Optional |
| Judul/Keperluan | Text              |
| Uraian          | Textarea          |
| Jumlah          | Currency          |
| Lampiran        | Dropzone Multiple |
| Catatan         | Textarea          |

Aksi berdasarkan status:

### DRAFT

* Simpan.
* Ubah.
* Hapus.
* Ajukan.

### SUBMITTED

* Lihat.
* Batalkan jika policy mengizinkan.
* Menunggu verifikasi.

### VERIFIED

* Menunggu pengesahan.

### SAH

* Read only.

---

# 23. VERIFIKASI PENGAJUAN

Pimpinan/Admin mendapatkan screen:

* Detail pengajuan.
* Pemohon.
* Periode.
* Kategori.
* Anggaran tersedia.
* Nominal pengajuan.
* Lampiran.
* Riwayat status.

Form verifikasi:

| Field               | Control                     |
| ------------------- | --------------------------- |
| Keputusan           | Approve / Revision / Reject |
| Catatan Verifikator | Textarea                    |

Aksi:

* Verifikasi.
* Minta Revisi.
* Tolak.

---

# 24. PENGESAHAN

Pimpinan/Admin:

* Review pengajuan terverifikasi.
* Sahkan.

Saat `SAH`:

* Record dikunci.
* Tidak dapat diubah langsung.
* Semua perubahan berikutnya harus melalui transaksi koreksi/reversal.

---

# 25. REALISASI PENGGUNAAN DANA

## Form Realisasi

| Field             | Type              |
| ----------------- | ----------------- |
| Periode           | Month             |
| Alokasi           | Select            |
| Pengajuan terkait | Select / Optional |
| Kategori          | Auto/Select       |
| Kegiatan          | Text              |
| Tanggal Realisasi | Date              |
| Nominal           | Currency          |
| Uraian            | Textarea          |
| Bukti Nota        | Camera/Dropzone   |
| Dokumentasi       | Multiple images   |
| Catatan           | Textarea          |

Validasi:

`total realisasi <= alokasi tersedia`

Kecuali Admin memberikan mekanisme adjustment resmi.

---

# 26. LAPORAN

Jenis laporan final:

### Laporan Keuangan Bulanan

* Saldo awal.
* Pemasukan.
* Pengeluaran.
* Saldo akhir.

### Laporan Iuran

* Kewajiban.
* Diterima.
* Tunggakan.
* Per blok.

### Laporan Blok

* Status.
* Excavator.
* Pekerja.
* Pemeriksaan.

### Laporan Pemeriksaan

* Petugas.
* Blok.
* Kondisi.
* Temuan.
* Dokumentasi.

### Laporan Excavator

* Aktif.
* Rusak.
* Tidak aktif.
* Keluar.
* Jam operasional.

### Laporan Realisasi

* Anggaran.
* Realisasi.
* Sisa.
* Serapan.

### Laporan Pengajuan

* Draft.
* Diajukan.
* Diverifikasi.
* Sah.
* Ditolak.

### Laporan Informasi

* Kegiatan.
* Keluhan.
* Insiden.
* Pemberitahuan.
* Status penyelesaian.

---

# 26.1 FILTER LAPORAN

* Hari.
* Bulan.
* Tahun.
* Custom date range.
* Blok.
* Pengelola.
* Kategori.
* Status.

Export:

* PDF.
* XLSX/Excel.

---

# 27. NOTIFICATION

Notification event:

* Petugas mendapatkan tugas baru.
* Pemeriksaan dikirim.
* Informasi lapangan baru.
* Insiden urgent.
* Informasi mendapat balasan.
* Iuran jatuh tempo.
* Tunggakan.
* Pengajuan baru.
* Pengajuan diverifikasi.
* Pengajuan disahkan.
* Pengajuan ditolak.
* Realisasi baru.
* Excavator rusak.
* Blok berubah status.

Notification:

* Read/unread.
* Mark as read.
* Mark all as read.
* Deep-link ke record terkait.

---

# 28. DATABASE MYSQL

Gunakan:

* MySQL 8.x.
* InnoDB.
* UTF8MB4.
* Foreign key.
* Index eksplisit.
* Soft delete hanya untuk master data yang memang perlu dipulihkan.
* Financial records tidak di-hard delete.

---

# 29. DATABASE — AUTH & USER

## `roles`

```text
id BIGINT PK
code VARCHAR(50) UNIQUE
name VARCHAR(100)
created_at DATETIME
updated_at DATETIME
```

Contoh:

* ADMIN_PIMPINAN
* BENDAHARA
* PETUGAS_LAPANGAN

---

## `users`

```text
id BIGINT PK
role_id BIGINT FK roles.id
name VARCHAR(150)
email VARCHAR(191) UNIQUE
username VARCHAR(100) UNIQUE NULL
phone VARCHAR(30) NULL
password_hash VARCHAR(255)
avatar_url VARCHAR(500) NULL
is_active BOOLEAN DEFAULT TRUE
last_login_at DATETIME NULL
created_at DATETIME
updated_at DATETIME
```

Index:

```text
role_id
email
username
is_active
```

---

# 30. BLOK

## `blocks`

```text
id BIGINT PK
code VARCHAR(50) UNIQUE
name VARCHAR(150)
manager_name VARCHAR(200)
pj_location_name VARCHAR(150) NULL
pj_location_phone VARCHAR(30) NULL
pj_field_name VARCHAR(150) NULL
pj_field_phone VARCHAR(30) NULL

operational_status ENUM(
  'ACTIVE',
  'TEMPORARY_STOPPED',
  'STOPPED',
  'NOT_STARTED'
)

priority_level ENUM(
  'NORMAL',
  'PRIORITY',
  'HIGH'
)

area DECIMAL(12,2) NULL
area_unit VARCHAR(20) NULL
operation_start_date DATE NULL

address TEXT NULL
rt_area VARCHAR(100) NULL

latitude DECIMAL(10,7) NULL
longitude DECIMAL(10,7) NULL

description TEXT NULL

created_by BIGINT FK users.id
created_at DATETIME
updated_at DATETIME
deleted_at DATETIME NULL
```

Index:

```text
code
operational_status
priority_level
manager_name
latitude, longitude
```

---

# 31. ASSIGNMENT PETUGAS

## `user_block_assignments`

```text
id BIGINT PK
user_id BIGINT FK users.id
block_id BIGINT FK blocks.id
assigned_at DATETIME
ended_at DATETIME NULL
is_active BOOLEAN
created_at DATETIME
```

Unique aktif secara business rule:

`user_id + block_id + is_active`

---

# 32. STATUS HISTORY BLOK

## `block_status_histories`

```text
id BIGINT PK
block_id BIGINT FK
previous_status VARCHAR(50) NULL
new_status VARCHAR(50)
previous_priority VARCHAR(50) NULL
new_priority VARCHAR(50) NULL
reason TEXT NULL
changed_by BIGINT FK users.id
changed_at DATETIME
```

---

# 33. MEDIA/FOTO BLOK

## `block_photos`

```text
id BIGINT PK
block_id BIGINT FK
file_url VARCHAR(500)
thumbnail_url VARCHAR(500) NULL
caption VARCHAR(255) NULL
latitude DECIMAL(10,7) NULL
longitude DECIMAL(10,7) NULL
uploaded_by BIGINT FK
captured_at DATETIME NULL
created_at DATETIME
```

---

# 34. TUGAS PETUGAS

## `field_tasks`

```text
id BIGINT PK
assignee_id BIGINT FK users.id
block_id BIGINT FK blocks.id NULL

task_type ENUM(
  'INSPECTION',
  'EXCAVATOR_CHECK',
  'WORKER_CHECK',
  'DAILY_INFORMATION',
  'OTHER'
)

title VARCHAR(200)
description TEXT NULL

status ENUM(
  'TODO',
  'IN_PROGRESS',
  'DONE',
  'CANCELLED'
)

due_at DATETIME NULL
completed_at DATETIME NULL
created_by BIGINT FK users.id
created_at DATETIME
updated_at DATETIME
```

---

# 35. PEMERIKSAAN

## `block_inspections`

```text
id BIGINT PK
block_id BIGINT FK
inspector_id BIGINT FK users.id

inspection_date DATE
inspection_time TIME

latitude DECIMAL(10,7) NULL
longitude DECIMAL(10,7) NULL

block_condition VARCHAR(50)
excavator_count INT DEFAULT 0
worker_count INT DEFAULT 0

road_condition VARCHAR(50) NULL
environment_condition VARCHAR(50) NULL
activity_condition VARCHAR(100) NULL

finding TEXT NULL
notes TEXT NULL

status ENUM(
  'DRAFT',
  'SUBMITTED'
)

submitted_at DATETIME NULL
created_at DATETIME
updated_at DATETIME
```

Indexes:

```text
block_id
inspector_id
inspection_date
status
(block_id, inspection_date)
```

---

## `inspection_photos`

```text
id BIGINT PK
inspection_id BIGINT FK
file_url VARCHAR(500)
thumbnail_url VARCHAR(500) NULL
file_name VARCHAR(255)
mime_type VARCHAR(100)
file_size BIGINT
captured_at DATETIME NULL
latitude DECIMAL(10,7) NULL
longitude DECIMAL(10,7) NULL
created_at DATETIME
```

---

# 36. EXCAVATOR

## `excavators`

```text
id BIGINT PK
code VARCHAR(100) UNIQUE
brand VARCHAR(100)
model VARCHAR(100)
serial_number VARCHAR(150) NULL
photo_url VARCHAR(500) NULL
created_at DATETIME
updated_at DATETIME
```

---

## `excavator_block_assignments`

```text
id BIGINT PK
excavator_id BIGINT FK
block_id BIGINT FK

operator_name VARCHAR(150) NULL

status ENUM(
  'ACTIVE',
  'DAMAGED',
  'INACTIVE',
  'EXITED'
)

entry_date DATE
exit_date DATE NULL

operational_hours DECIMAL(12,2) DEFAULT 0

notes TEXT NULL
created_by BIGINT FK
created_at DATETIME
updated_at DATETIME
```

---

## `excavator_histories`

```text
id BIGINT PK
excavator_id BIGINT FK
block_id BIGINT FK NULL

event_type ENUM(
  'ENTER',
  'STATUS_CHANGE',
  'OPERATOR_CHANGE',
  'HOUR_UPDATE',
  'EXIT'
)

old_value TEXT NULL
new_value TEXT NULL
notes TEXT NULL

created_by BIGINT FK
created_at DATETIME
```

---

# 37. PEKERJA

## `workers`

```text
id BIGINT PK
name VARCHAR(150)
phone VARCHAR(30) NULL
position VARCHAR(100) NULL
photo_url VARCHAR(500) NULL
is_active BOOLEAN DEFAULT TRUE
created_at DATETIME
updated_at DATETIME
```

---

## `worker_block_assignments`

```text
id BIGINT PK
worker_id BIGINT FK
block_id BIGINT FK
start_date DATE
end_date DATE NULL
is_active BOOLEAN
created_at DATETIME
updated_at DATETIME
```

---

# 38. INFORMASI HARIAN

## `daily_information`

```text
id BIGINT PK
block_id BIGINT FK NULL
created_by BIGINT FK users.id

type ENUM(
  'ACTIVITY',
  'COMPLAINT',
  'INCIDENT',
  'NOTICE',
  'INFORMATION'
)

title VARCHAR(255)
description TEXT

location_text VARCHAR(255) NULL
latitude DECIMAL(10,7) NULL
longitude DECIMAL(10,7) NULL

priority ENUM(
  'NORMAL',
  'IMPORTANT',
  'URGENT'
)

status ENUM(
  'DRAFT',
  'SENT',
  'READ',
  'RESPONDED',
  'RESOLVED'
)

submitted_at DATETIME NULL
resolved_at DATETIME NULL

created_at DATETIME
updated_at DATETIME
```

Indexes:

```text
block_id
created_by
type
priority
status
created_at
```

---

## `daily_information_photos`

```text
id BIGINT PK
information_id BIGINT FK
file_url VARCHAR(500)
thumbnail_url VARCHAR(500) NULL
created_at DATETIME
```

---

## `information_replies`

```text
id BIGINT PK
information_id BIGINT FK
user_id BIGINT FK
message TEXT
created_at DATETIME
```

---

# 39. IURAN

## `dues`

```text
id BIGINT PK
block_id BIGINT FK

due_type ENUM(
  'MONTHLY',
  'ROAD'
)

period_year SMALLINT
period_month TINYINT

amount_due DECIMAL(18,2)
amount_paid DECIMAL(18,2) DEFAULT 0

due_date DATE NULL

status ENUM(
  'UNPAID',
  'PARTIAL',
  'PAID',
  'OVERDUE'
)

notes TEXT NULL

created_by BIGINT FK
created_at DATETIME
updated_at DATETIME
```

Unique:

```text
UNIQUE(block_id, due_type, period_year, period_month)
```

---

# 40. PEMBAYARAN IURAN

## `due_payments`

```text
id BIGINT PK
due_id BIGINT FK

payment_date DATE
amount DECIMAL(18,2)

payment_method ENUM(
  'CASH',
  'TRANSFER',
  'QRIS',
  'OTHER'
)

reference_number VARCHAR(150) NULL
proof_url VARCHAR(500) NULL
notes TEXT NULL

recorded_by BIGINT FK users.id
created_at DATETIME
```

---

# 41. TRANSAKSI KAS

## `cash_transactions`

```text
id BIGINT PK

transaction_type ENUM(
  'IN',
  'OUT'
)

transaction_date DATE

category_id BIGINT NULL

amount DECIMAL(18,2)

source_type VARCHAR(50) NULL
source_id BIGINT NULL

description TEXT
attachment_url VARCHAR(500) NULL

is_locked BOOLEAN DEFAULT FALSE

created_by BIGINT FK
created_at DATETIME
updated_at DATETIME
```

Financial record yang sudah posted sebaiknya tidak dihapus.

---

# 42. KATEGORI KEUANGAN

## `finance_categories`

```text
id BIGINT PK
type ENUM('INCOME','EXPENSE')
code VARCHAR(50) UNIQUE
name VARCHAR(150)
description TEXT NULL
is_active BOOLEAN
created_at DATETIME
updated_at DATETIME
```

---

# 43. PERIODE ANGGARAN

## `budget_periods`

```text
id BIGINT PK
year SMALLINT
month TINYINT
total_budget DECIMAL(18,2)
status ENUM('DRAFT','ACTIVE','CLOSED')
created_at DATETIME
updated_at DATETIME
```

Unique:

`year + month`

---

# 44. KATEGORI ANGGARAN

## `budget_categories`

```text
id BIGINT PK
parent_id BIGINT NULL
code VARCHAR(50) UNIQUE
name VARCHAR(200)
description TEXT NULL
is_active BOOLEAN
sort_order INT DEFAULT 0
created_at DATETIME
updated_at DATETIME
```

`parent_id` memungkinkan Sub Kategori.

---

# 45. ALOKASI ANGGARAN

## `budget_allocations`

```text
id BIGINT PK
budget_period_id BIGINT FK
category_id BIGINT FK

amount DECIMAL(18,2)
description TEXT NULL

created_by BIGINT FK
created_at DATETIME
updated_at DATETIME
```

Unique:

`budget_period_id + category_id`

---

# 46. PENGAJUAN DANA

## `fund_requests`

```text
id BIGINT PK
request_number VARCHAR(100) UNIQUE

budget_period_id BIGINT FK
category_id BIGINT FK
block_id BIGINT NULL

request_date DATE
title VARCHAR(255)
description TEXT
amount DECIMAL(18,2)

status ENUM(
  'DRAFT',
  'SUBMITTED',
  'REVISION_REQUIRED',
  'VERIFIED',
  'APPROVED',
  'REJECTED',
  'CANCELLED'
)

requested_by BIGINT FK

submitted_at DATETIME NULL
verified_by BIGINT NULL
verified_at DATETIME NULL
approved_by BIGINT NULL
approved_at DATETIME NULL

created_at DATETIME
updated_at DATETIME
```

Untuk UI:

`APPROVED = SAH`

---

## `fund_request_attachments`

```text
id BIGINT PK
fund_request_id BIGINT FK
file_url VARCHAR(500)
file_name VARCHAR(255)
mime_type VARCHAR(100)
created_at DATETIME
```

---

## `fund_request_status_histories`

```text
id BIGINT PK
fund_request_id BIGINT FK

from_status VARCHAR(50) NULL
to_status VARCHAR(50)

notes TEXT NULL

changed_by BIGINT FK
changed_at DATETIME
```

---

# 47. REALISASI

## `budget_realizations`

```text
id BIGINT PK

budget_allocation_id BIGINT FK
fund_request_id BIGINT NULL

realization_date DATE
activity_name VARCHAR(255)
description TEXT

amount DECIMAL(18,2)

created_by BIGINT FK

created_at DATETIME
updated_at DATETIME
```

---

## `realization_attachments`

```text
id BIGINT PK
realization_id BIGINT FK
file_url VARCHAR(500)
file_name VARCHAR(255)
attachment_type ENUM(
  'RECEIPT',
  'PHOTO',
  'DOCUMENT'
)
created_at DATETIME
```

---

# 48. NOTIFICATION

## `notifications`

```text
id BIGINT PK
user_id BIGINT FK

type VARCHAR(100)
title VARCHAR(255)
message TEXT

reference_type VARCHAR(100) NULL
reference_id BIGINT NULL

is_read BOOLEAN DEFAULT FALSE
read_at DATETIME NULL

created_at DATETIME
```

Index:

```text
(user_id, is_read, created_at)
```

---

# 49. AUDIT LOG

## `audit_logs`

```text
id BIGINT PK

user_id BIGINT FK NULL

action ENUM(
  'CREATE',
  'UPDATE',
  'DELETE',
  'SUBMIT',
  'VERIFY',
  'APPROVE',
  'REJECT',
  'CANCEL',
  'LOGIN',
  'EXPORT'
)

entity_type VARCHAR(100)
entity_id BIGINT NULL

old_values JSON NULL
new_values JSON NULL

ip_address VARCHAR(45) NULL
user_agent TEXT NULL

created_at DATETIME
```

**Audit logs tidak boleh bisa diedit melalui aplikasi.**

---

# 50. RELASI DATABASE UTAMA

```text
roles
 └── users
      ├── field_tasks
      ├── block_inspections
      ├── daily_information
      ├── fund_requests
      ├── cash_transactions
      └── audit_logs


blocks
 ├── user_block_assignments
 ├── block_status_histories
 ├── block_photos
 ├── block_inspections
 │    └── inspection_photos
 ├── excavator_block_assignments
 ├── worker_block_assignments
 ├── daily_information
 ├── dues
 │    └── due_payments
 └── fund_requests


excavators
 ├── excavator_block_assignments
 └── excavator_histories


budget_periods
 ├── budget_allocations
 │    └── budget_realizations
 └── fund_requests


budget_categories
 ├── budget_allocations
 └── fund_requests


fund_requests
 ├── fund_request_attachments
 ├── fund_request_status_histories
 └── budget_realizations
```

---

# 51. FORM & INPUT COMPONENT MASTER

Sistem minimal memerlukan reusable component berikut:

## Text

* Text Input.
* Search Input.
* Number Input.
* Currency Input.
* Telephone Input.
* Textarea.

## Selection

* Select.
* Searchable Select.
* Multi Select.
* Radio Group.
* Checkbox.
* Status Select.

## Date/Time

* Date Picker.
* Time Picker.
* Month Picker.
* Date Range Picker.

## Numeric

* Number Stepper +/−.
* Decimal Input.
* Currency Input.

## File

* Dropzone.
* Open Camera.
* Open Gallery.
* Multi Upload.
* Image Preview.
* File Preview.
* Delete Attachment.
* Replace Attachment.

## Location

* `Ambil Lokasi Saya`.
* Browser Geolocation.
* Latitude.
* Longitude.
* Map Picker.
* Recenter.
* Open location on map.

## Operational

* Status Badge.
* Progress Bar.
* Timeline.
* Activity Log.
* Tabs.
* Accordion if required.

---

# 52. MASTER FORM YANG HARUS TERSEDIA

## Pimpinan/Admin

1. Tambah/Edit Blok.
2. Update Status Blok.
3. Assign Petugas.
4. Tambah Pemeriksaan.
5. Tambah/Edit Excavator.
6. Update Excavator.
7. Tambah/Edit Pekerja.
8. Reply Informasi.
9. Tandai Informasi Prioritas.
10. Generate Iuran.
11. Catat Pembayaran.
12. Transaksi Masuk.
13. Transaksi Keluar.
14. Kategori Anggaran.
15. Alokasi Anggaran.
16. Verifikasi Pengajuan.
17. Pengesahan Pengajuan.
18. Realisasi.
19. Filter Laporan.
20. User Management.
21. Profile/Settings.

---

## Bendahara

1. Generate Iuran.
2. Catat Pembayaran.
3. Transaksi Masuk.
4. Transaksi Keluar.
5. Buat Alokasi.
6. Buat Pengajuan.
7. Edit Draft Pengajuan.
8. Upload Lampiran.
9. Batalkan Pengajuan.
10. Input Realisasi.
11. Upload Bukti Realisasi.
12. Filter laporan.
13. Export laporan.

---

## Petugas Lapangan

1. Input Pemeriksaan.
2. Capture GPS.
3. Upload/Open Camera Dokumentasi.
4. Simpan Draft Pemeriksaan.
5. Submit Pemeriksaan.
6. Tambah Excavator.
7. Update Excavator.
8. Data Pekerja.
9. Kirim Informasi.
10. Upload Foto Informasi.
11. Simpan Draft Informasi.
12. Update Status Tugas.
13. Profile.

---

# 53. BUSINESS RULE PENTING

## 53.1 Status dan Prioritas Blok Dipisah

Jangan menggunakan satu kolom untuk:

* ACTIVE.
* STOPPED.
* PRIORITY.

Karena `PRIORITY` bukan status operasional.

Gunakan:

```text
operational_status
priority_level
```

---

# 53.2 Pengajuan SAH Tidak Boleh Diedit

Setelah:

`status = APPROVED`

data utama dikunci.

Jika terjadi kesalahan:

* Buat correction/reversal.
* Jangan overwrite history.

---

# 53.3 Financial Records Tidak Boleh Hard Delete

Pembayaran, transaksi, alokasi, realisasi, pengajuan sah:

* Tidak boleh hard delete.
* Gunakan reversal/cancellation.
* Catat audit.

---

# 53.4 Saldo Kas Dihitung

Jangan menyimpan saldo hanya sebagai angka yang dapat diubah user.

Gunakan ledger/transaksi.

---

# 53.5 Realisasi Tidak Boleh Melebihi Anggaran

Validasi server:

```text
SUM(realization.amount) <= allocation.amount
```

---

# 53.6 Pembayaran Iuran Harus Transactional

Saat pembayaran masuk:

1. Insert payment.
2. Update `amount_paid`.
3. Update status due.
4. Create transaksi kas masuk.
5. Create audit log.

Semua dilakukan dalam **1 database transaction**.

Jika salah satu gagal:

`ROLLBACK`.

---

# 53.7 Submit Pengajuan Harus Transactional

Perubahan:

`DRAFT → SUBMITTED`

harus menghasilkan:

* Status update.
* Status history.
* Notification.
* Audit log.

---

# 53.8 Pemeriksaan Harus Memiliki Timestamp Server

Tanggal dari perangkat dapat disimpan sebagai data pemeriksaan.

Namun sistem juga wajib menyimpan:

`created_at` dari server.

---

# 54. SEARCH & FILTER

## Blok

* Nama.
* Kode.
* Pengelola.
* Status.
* Prioritas.

## Excavator

* Kode.
* Merek.
* Model.
* Operator.
* Blok.
* Status.

## Pemeriksaan

* Blok.
* Petugas.
* Tanggal.
* Status.

## Informasi

* Type.
* Blok.
* Priority.
* Status.
* Periode.

## Keuangan

* Periode.
* Blok.
* Pengelola.
* Status pembayaran.

## Pengajuan

* Nomor.
* Status.
* Kategori.
* Periode.

---

# 55. INDEX MYSQL WAJIB

Minimal:

```sql
blocks(code);
blocks(operational_status);
blocks(priority_level);

block_inspections(block_id, inspection_date);
block_inspections(inspector_id);
block_inspections(status);

excavator_block_assignments(block_id, status);
excavator_block_assignments(excavator_id);

worker_block_assignments(block_id, is_active);

daily_information(block_id, created_at);
daily_information(type, status);
daily_information(priority);

dues(block_id, period_year, period_month);
dues(status);
dues(due_type);

due_payments(due_id, payment_date);

cash_transactions(transaction_date);
cash_transactions(transaction_type);

budget_allocations(budget_period_id, category_id);

fund_requests(status);
fund_requests(budget_period_id);
fund_requests(category_id);

budget_realizations(budget_allocation_id);
budget_realizations(realization_date);

notifications(user_id, is_read, created_at);

audit_logs(entity_type, entity_id);
audit_logs(user_id, created_at);
```

---

# 56. RESPONSIVE BEHAVIOR

## Mobile

Fokus Petugas:

* Bottom navigation.
* Big tap targets.
* Kamera langsung.
* GPS langsung.
* Form multi-step.
* Sticky primary action.
* Minimal horizontal table.

Admin/Bendahara mobile:

* Cards.
* Compact list.
* Tabs.
* Drawer navigation.

---

## Desktop

Gunakan:

* Sidebar.
* Header.
* KPI cards.
* Data table.
* Filter bar.
* Charts.
* Two-column layouts.
* Map + detail panel.
* Modal/Drawer form.

**Desktop tidak boleh hanya menjadi tampilan HP yang diperbesar.**

---

# 57. REAL-TIME / FRESH DATA

Data yang harus cepat terlihat setelah submit:

* Pemeriksaan baru.
* Informasi/insiden.
* Status blok.
* Excavator.
* Pengajuan.
* Verifikasi.
* Pembayaran.
* Realisasi.

Tidak wajib menggunakan WebSocket untuk MVP.

Pendekatan dapat menggunakan:

* Server refresh.
* Polling periodik.
* Refetch on focus.
* WebSocket/SSE sebagai enhancement.

---

# 58. DRAFT FORM

Draft diperlukan minimal untuk:

* Pemeriksaan.
* Informasi.
* Pengajuan Dana.

Draft harus tersimpan di database sehingga tidak hilang ketika perangkat berganti.

Optional enhancement:

* LocalStorage/IndexedDB sebagai temporary autosave.

---

# 59. FOTO & FILE

Jangan menyimpan binary image langsung dalam MySQL.

MySQL hanya menyimpan:

* URL/path.
* Filename.
* MIME.
* Size.
* Metadata.

File fisik disimpan di:

* Object storage.
* Local storage server untuk deployment sederhana.

Recommended upload rule:

* JPG.
* JPEG.
* PNG.
* WebP.
* PDF untuk dokumen.

Image compression dilakukan sebelum/ketika upload.

---

# 60. PROFILE

Semua role mempunyai Profile.

Data:

* Nama.
* Email.
* Nomor HP.
* Avatar.
* Role.

Aksi:

* Edit Profile.
* Change Password.
* Logout.

---

# 61. PENGATURAN ADMIN

Karena menu `Pengaturan` muncul pada desktop, sediakan:

* Profil organisasi.
* Logo.
* Nama sistem.
* Master kategori anggaran.
* Master kategori transaksi.
* Status/value master jika diperlukan.
* User management.
* Role management.
* Default nominal iuran.
* Periode aktif.
* Upload limits.
* Report settings.

---

# 62. AUDIT TRAIL

Record audit minimal:

* Siapa.
* Kapan.
* Device/IP.
* Entity.
* Action.
* Nilai sebelum.
* Nilai sesudah.

Contoh:

```text
18 Mei 2024 09:15
Petugas 01
SUBMIT_INSPECTION
Blok 07
```

```text
18 Mei 2024 11:20
Bendahara
CREATE_PAYMENT
Blok 07
Rp100.000.000
```

```text
18 Mei 2024 15:40
Admin
APPROVE_FUND_REQUEST
PD-2405-004
```

---

# 63. ACTIVITY / RIWAYAT BLOK

Riwayat Blok tidak perlu dibuat manual.

Generate dari event:

* Status blok berubah.
* Pemeriksaan.
* Excavator masuk.
* Excavator keluar.
* Informasi.
* Pekerja berubah.
* Foto lokasi.
* Pengajuan terkait blok.

Feed:

```text
Tanggal
Waktu
Icon
Jenis aktivitas
Deskripsi
User
Attachment
```

---

# 64. ACCEPTANCE CRITERIA — PETUGAS

Petugas dinyatakan selesai jika:

* Bisa login.
* Hanya melihat fitur sesuai role.
* Bisa melihat tugas.
* Bisa melihat blok.
* Bisa membuka peta.
* Bisa membuka detail blok.
* Bisa mengambil GPS.
* Bisa melakukan pemeriksaan.
* Bisa menggunakan camera.
* Bisa upload multiple photo.
* Bisa simpan Draft.
* Bisa submit.
* Bisa melihat excavator.
* Bisa menambah/update excavator sesuai izin.
* Bisa mengelola data pekerja sesuai izin.
* Bisa membuat informasi.
* Bisa melihat informasi yang dikirim.
* Bisa melihat balasan Admin.
* Semua submit menghasilkan timestamp dan user.

---

# 65. ACCEPTANCE CRITERIA — BENDAHARA

* Bisa melihat dashboard keuangan.
* Bisa melihat iuran.
* Bisa melihat iuran jalan.
* Bisa generate kewajiban.
* Bisa mencatat pembayaran.
* Status tunggakan berubah otomatis.
* Saldo kas berubah melalui transaksi.
* Bisa mencatat transaksi masuk.
* Bisa mencatat transaksi keluar.
* Bisa membuat alokasi.
* Bisa membuat pengajuan.
* Bisa simpan Draft.
* Bisa submit.
* Bisa melihat status verifikasi.
* Bisa mencatat realisasi.
* Bisa upload bukti.
* Bisa membuat laporan.
* Data SAH tidak dapat diedit langsung.

---

# 66. ACCEPTANCE CRITERIA — PIMPINAN/ADMIN

* Bisa melihat semua dashboard.
* Bisa melihat map.
* Bisa search/filter blok.
* Bisa melihat detail blok.
* Bisa melihat history.
* Bisa melihat pemeriksaan.
* Bisa melihat foto.
* Bisa melihat excavator.
* Bisa melihat pekerja.
* Bisa melihat informasi.
* Bisa reply.
* Bisa melihat seluruh keuangan.
* Bisa melihat tunggakan.
* Bisa melihat alokasi.
* Bisa melakukan verifikasi.
* Bisa mengesahkan.
* Bisa melihat realisasi.
* Bisa export laporan PDF.
* Bisa export Excel.
* Bisa melihat audit trail.
* Bisa mengelola user.
* Bisa mengakses Pengaturan.

---

# 67. NAVIGATION FINAL

## Pimpinan/Admin Desktop

```text
Dashboard
Monitoring
 ├─ Peta Blok
 ├─ Daftar Blok
 ├─ Pemeriksaan
 ├─ Excavator
 └─ Pekerja

Keuangan
 ├─ Ringkasan
 ├─ Iuran Bulanan
 ├─ Iuran Jalan
 ├─ Pembayaran
 ├─ Tunggakan
 ├─ Transaksi Masuk
 └─ Transaksi Keluar

Anggaran
 ├─ Ringkasan
 ├─ Alokasi
 └─ Pengajuan

Realisasi
Informasi Harian
Laporan
Notifikasi
Audit Log
Pengaturan
Profil
```

---

## Bendahara

```text
Dashboard
Keuangan
 ├─ Iuran Bulanan
 ├─ Iuran Jalan
 ├─ Pembayaran
 ├─ Tunggakan
 ├─ Dana Masuk
 └─ Dana Keluar

Anggaran
Pengajuan
Realisasi
Laporan
Notifikasi
Profil
```

---

## Petugas

```text
Beranda
Peta/Blok
Pemeriksaan
Excavator
Pekerja
Informasi
Tugas Saya
Notifikasi
Profil
```

Bottom Navigation dapat disederhanakan menjadi:

```text
Beranda
Blok
Input
Informasi
Profil
```

Menu lainnya masuk melalui quick actions.

---

# 68. NON-FUNCTIONAL REQUIREMENTS

## Performance

Target:

* Initial dashboard < 3 detik pada koneksi normal.
* API common request < 500–800 ms.
* Pagination pada daftar besar.
* Lazy load image.
* Thumbnail image.
* Query tidak melakukan full table scan untuk modul utama.

---

## Security

Wajib:

* Password hashing.
* Server-side authorization.
* CSRF protection sesuai architecture.
* Input validation.
* File validation.
* MIME validation.
* Rate limiting login.
* SQL parameter binding/ORM.
* Secure cookies.
* Session expiration.
* Audit logs.
* Access checks per block untuk petugas.

**Jangan hanya menyembunyikan menu di frontend.**

Backend harus menolak request yang tidak mempunyai permission.

---

# 69. VALIDASI FILE

Image:

* Max size configurable.
* Validate MIME.
* Randomize storage filename.
* Jangan menggunakan nama upload asli sebagai storage key.
* Generate thumbnail.
* Strip metadata sensitif jika diperlukan.

Document:

* PDF.
* JPG.
* PNG.

---

# 70. VALIDASI GPS

GPS hasil client bukan bukti absolut.

Simpan:

* latitude.
* longitude.
* timestamp.
* accuracy jika tersedia.

Tambahkan:

```text
gps_accuracy DECIMAL(10,2)
```

ke pemeriksaan/informasi bila ingin memvalidasi kualitas lokasi.

---

# 71. QUERY DASHBOARD

Jangan menyimpan angka dashboard sebagai data manual seperti:

`total_excavator_active = 68`

Angka tersebut dihitung dari database.

Contoh:

```text
Total Blok
= COUNT(blocks)

Excavator Aktif
= COUNT(excavator assignments WHERE status = ACTIVE)

Pekerja
= COUNT(active worker assignments)

Iuran Diterima
= SUM(due_payments)

Tunggakan
= SUM(dues.amount_due - dues.amount_paid)

Realisasi
= SUM(budget_realizations.amount)
```

Dengan begitu angka desktop, mobile, dan laporan selalu konsisten.

---

# 72. KEPUTUSAN IMPLEMENTASI FINAL

Mockup memiliki beberapa variasi istilah. Implementasi final menggunakan nomenklatur berikut:

| Mockup A          | Mockup B           | Nama Sistem Final       |
| ----------------- | ------------------ | ----------------------- |
| Dana Masuk        | Transaksi Masuk    | Transaksi Masuk         |
| Dana Keluar       | Transaksi Keluar   | Transaksi Keluar        |
| Berhenti          | Berhenti Sementara | Status Operasional      |
| Prioritas         | Status map         | Priority Level terpisah |
| Sah               | Approved           | SAH / APPROVED          |
| Kegiatan          | Informasi          | Daily Information Type  |
| Lainnya           | Informasi          | INFORMATION             |
| Pengelola         | Manager            | Pengelola               |
| Alokasi Bulan Ini | Anggaran           | Budget Allocation       |

---

# 73. FITUR YANG TIDAK BOLEH TERLUPAKAN

Checklist final:

* [ ] Login
* [ ] Role based access
* [ ] Dashboard Pimpinan/Admin
* [ ] Dashboard Bendahara
* [ ] Dashboard Petugas
* [ ] Notification
* [ ] Tugas Saya
* [ ] Monitoring Blok
* [ ] Daftar Blok
* [ ] Peta Blok
* [ ] Filter Peta
* [ ] Legend Peta
* [ ] Detail Blok
* [ ] Identitas Blok
* [ ] Operasional Blok
* [ ] Status Blok
* [ ] Priority Blok
* [ ] Riwayat Blok
* [ ] Dokumentasi Blok
* [ ] Pemeriksaan
* [ ] Draft Pemeriksaan
* [ ] GPS
* [ ] Open Camera
* [ ] Gallery Upload
* [ ] Dropzone
* [ ] Multiple Photo
* [ ] Excavator
* [ ] Status Excavator
* [ ] Operator
* [ ] Jam Operasional
* [ ] Histori Excavator
* [ ] Excavator Masuk
* [ ] Excavator Keluar
* [ ] Pekerja
* [ ] Informasi Harian
* [ ] Kegiatan
* [ ] Keluhan
* [ ] Insiden
* [ ] Pemberitahuan
* [ ] Informasi Lainnya
* [ ] Informasi Saya
* [ ] Reply Informasi
* [ ] Priority Informasi
* [ ] Iuran Bulanan
* [ ] Iuran Jalan
* [ ] Generate Iuran
* [ ] Pembayaran
* [ ] Tunggakan
* [ ] Transaksi Masuk
* [ ] Transaksi Keluar
* [ ] Saldo Kas
* [ ] Kategori Anggaran
* [ ] Alokasi Anggaran
* [ ] Pengajuan Dana
* [ ] Draft Pengajuan
* [ ] Diajukan
* [ ] Diverifikasi
* [ ] Sah
* [ ] Rejected/Revision
* [ ] Detail Pengajuan
* [ ] Lampiran Pengajuan
* [ ] Realisasi
* [ ] Bukti Realisasi
* [ ] Realisasi per Kategori
* [ ] Realisasi per Kegiatan
* [ ] Laporan Keuangan
* [ ] Laporan Iuran
* [ ] Laporan Blok
* [ ] Laporan Pemeriksaan
* [ ] Laporan Excavator
* [ ] Laporan Pengajuan
* [ ] Laporan Realisasi
* [ ] Laporan Informasi
* [ ] Export PDF
* [ ] Export Excel
* [ ] Search
* [ ] Filter
* [ ] Period Filter
* [ ] Activity Feed
* [ ] Audit Trail
* [ ] User Management
* [ ] Profile
* [ ] Pengaturan
* [ ] Responsive Mobile
* [ ] Dashboard Desktop
* [ ] Financial Transaction Lock
* [ ] Database Transaction
* [ ] Server-side Authorization
* [ ] Server-side Validation

---

# 74. FINAL SCOPE

Dengan hasil trace seluruh mockup, sistem ini bukan sekadar **dashboard input data desa**.

Struktur sebenarnya sudah menyerupai **mini ERP operasional SATGAS**, terdiri dari empat domain utama:

```text
OPERASIONAL
Blok → Petugas → Pemeriksaan → Pekerja → Excavator → Informasi

FINANCE
Iuran → Pembayaran → Tunggakan → Cash Ledger

BUDGETING
Periode Anggaran → Alokasi → Pengajuan → Verifikasi → SAH → Realisasi

MANAGEMENT
Dashboard → Peta → Monitoring → Alert → Laporan → Audit
```

Semua domain harus menggunakan database dan ID record yang sama sehingga tidak terjadi duplikasi data antara aplikasi Petugas, Bendahara, dan Pimpinan/Admin.

**Prinsip arsitektur data utama: satu database MySQL, satu backend authorization layer, satu source of truth, UI berbeda berdasarkan role.**
