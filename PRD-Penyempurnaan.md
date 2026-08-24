Saya konsolidasikan requirement hasil trace sebelumnya menjadi satu spesifikasi **mobile-only**. Scope asal tetap mempertahankan tiga role—Pimpinan/Admin, Bendahara, dan Petugas Lapangan—serta empat domain utama: operasional, finance, budgeting, dan management dalam satu source of truth MySQL.  Aturan kritis seperti transaksi finansial tidak boleh hard-delete, data `SAH` dikunci, saldo berbasis ledger, dan realisasi tidak boleh melebihi alokasi juga tetap dipertahankan. 

# FINAL PRODUCT REQUIREMENTS DOCUMENT

## SATGAS DESA SEJOLI — Mobile Operational, Finance & Monitoring System

**Document Version:** 2.0 Final
**Platform:** React Native Mobile Application
**Architecture:** Mobile App + REST API + MySQL
**Backend:** Laravel REST API
**Database:** MySQL 8.x
**Backend Deployment:** cPanel
**Primary Roles:** Pimpinan/Admin, Bendahara, Petugas Lapangan
**Application Type:** Internal Role-Based Mobile Application

---

# 1. PRODUCT OVERVIEW

SATGAS Desa Sejoli adalah aplikasi mobile internal untuk mengelola seluruh aktivitas operasional SATGAS dalam satu sistem terintegrasi.

Sistem mencakup empat domain utama:

```text
OPERASIONAL
Blok
→ Petugas
→ Pemeriksaan
→ Pekerja
→ Excavator
→ Informasi Lapangan

FINANCE
Iuran
→ Pembayaran
→ Tunggakan
→ Transaksi Kas

BUDGETING
Periode Anggaran
→ Alokasi
→ Pengajuan Dana
→ Verifikasi
→ Pengesahan
→ Realisasi

MANAGEMENT
Dashboard
→ Monitoring
→ Peta
→ Alert
→ Notifikasi
→ Laporan
→ Audit Trail
```

Semua role menggunakan **satu aplikasi React Native yang sama**.

Tampilan, menu, data, dan aksi ditentukan berdasarkan:

```text
User
→ Role
→ Permission
→ Allowed Screen
→ Allowed Action
```

Tidak akan dibuat:

* aplikasi terpisah untuk masing-masing role;
* dashboard web;
* database terpisah per role;
* backend berbeda per role.

Semua data menggunakan:

```text
1 Mobile Application
1 REST API
1 MySQL Database
1 Authentication System
1 Permission System
1 Audit System
```

---

# 2. PRODUCT GOALS

Aplikasi harus mampu:

1. Memusatkan data seluruh blok.
2. Menampilkan kondisi lapangan secara cepat.
3. Mencatat pemeriksaan dengan GPS.
4. Mendokumentasikan kondisi menggunakan kamera HP.
5. Memantau excavator setiap blok.
6. Memantau pekerja setiap blok.
7. Mengirim kegiatan, keluhan, insiden, dan pemberitahuan.
8. Mengelola iuran dan tunggakan.
9. Mengelola transaksi kas.
10. Mengelola anggaran.
11. Mengelola pengajuan dana.
12. Mendukung verifikasi dan pengesahan.
13. Mengelola realisasi penggunaan dana.
14. Menyediakan laporan.
15. Memberikan notifikasi sesuai role.
16. Mencatat seluruh perubahan sensitif dalam audit trail.
17. Tetap usable dalam kondisi jaringan lapangan yang buruk.
18. Mempunyai codebase yang mudah dilanjutkan developer lain.

---

# 3. NON-GOALS

Versi ini tidak membutuhkan:

* Desktop application.
* Web dashboard.
* Public website.
* Public registration.
* Public user portal.
* WebSocket infrastructure.
* Microservices.
* Kubernetes.
* Dedicated Redis requirement.
* Complex message broker.

Arsitektur sengaja dibuat cukup sederhana agar:

* mudah dideploy ke cPanel;
* mudah dipelihara;
* murah secara infrastruktur;
* tetap memiliki standar production.

---

# 4. TECHNOLOGY STACK

## 4.1 Mobile

```text
React Native
Expo
TypeScript
Expo Router
```

State & Data:

```text
TanStack Query
Zustand
React Hook Form
Zod
```

Device Integration:

```text
Expo Camera
Expo Image Picker
Expo Image Manipulator
Expo Location
Expo SecureStore
Expo SQLite
Expo Notifications
NetInfo
```

Maps:

```text
react-native-maps
```

Monitoring:

```text
Sentry
```

Build:

```text
Expo EAS Build
```

---

# 4.2 Backend

```text
Laravel
Laravel Sanctum
REST API
PHP
```

Responsibilities:

* authentication;
* authorization;
* business logic;
* validation;
* transactions;
* file handling;
* reporting;
* notifications;
* audit;
* API.

---

# 4.3 Database

```text
MySQL 8.x
InnoDB
utf8mb4
```

Wajib menggunakan:

* foreign key;
* unique constraint;
* indexes;
* database transaction;
* migration;
* seeder.

---

# 4.4 Deployment

Backend:

```text
api.domain.com
↓
cPanel
↓
Laravel
↓
MySQL
```

Media dapat menggunakan:

### MVP

```text
Laravel Storage
```

atau lebih direkomendasikan:

```text
Cloudflare R2
```

untuk:

* foto pemeriksaan;
* foto blok;
* foto excavator;
* foto informasi;
* bukti pembayaran;
* bukti realisasi;
* lampiran pengajuan.

---

# 5. HIGH LEVEL ARCHITECTURE

```text
┌──────────────────────────────────┐
│       React Native Mobile        │
│                                  │
│ Admin | Bendahara | Petugas      │
│                                  │
│ Query Cache                      │
│ SQLite                           │
│ Secure Storage                   │
│ Camera                           │
│ GPS                              │
└────────────────┬─────────────────┘
                 │
                 │ HTTPS
                 ▼
┌──────────────────────────────────┐
│         Laravel REST API         │
│                                  │
│ Authentication                   │
│ RBAC                             │
│ Validation                       │
│ Business Logic                   │
│ Transactions                     │
│ Audit                            │
│ Reports                          │
└──────────────┬────────────┬──────┘
               │            │
               ▼            ▼
          MySQL 8        Storage/R2
```

---

# 6. USER ROLES

Sistem memiliki tiga role utama.

```text
ADMIN_PIMPINAN
BENDAHARA
PETUGAS_LAPANGAN
```

Tetapi authorization tidak boleh hanya menggunakan pengecekan:

```text
role === ADMIN
```

Gunakan permission granular.

Contoh:

```text
blocks.read
blocks.create
blocks.update

inspections.read
inspections.create

excavators.read
excavators.create
excavators.update

workers.read
workers.create

information.read
information.create
information.reply

finance.read
finance.create

budget.read
budget.create

fund_request.create
fund_request.verify
fund_request.approve

realization.read
realization.create

reports.read
audit.read

users.manage
```

---

# 7. ROLE — PIMPINAN / ADMIN

Pimpinan/Admin mempunyai akses monitoring dan approval terbesar.

## Dashboard

Dapat melihat:

* total blok;
* blok aktif;
* blok berhenti;
* blok belum operasi;
* blok prioritas;
* excavator aktif;
* excavator rusak;
* jumlah pekerja;
* iuran bulan berjalan;
* tunggakan;
* saldo kas;
* alokasi;
* realisasi;
* persentase serapan;
* pengajuan menunggu verifikasi;
* informasi baru;
* insiden penting.

## Monitoring

Dapat:

* melihat seluruh blok;
* melihat peta;
* mencari blok;
* memfilter blok;
* membuka detail;
* melihat histori;
* melihat dokumentasi.

## Operasional

Dapat:

* membuat/edit blok;
* mengubah status;
* assign petugas;
* melihat pemeriksaan;
* membuat pemeriksaan bila diperlukan;
* mengelola excavator;
* mengelola pekerja.

## Informasi

Dapat:

* membaca semua informasi;
* memfilter;
* membalas;
* mengubah prioritas;
* menandai selesai.

## Finance

Dapat:

* melihat seluruh iuran;
* pembayaran;
* tunggakan;
* transaksi masuk;
* transaksi keluar;
* saldo kas.

## Budgeting

Dapat:

* melihat anggaran;
* mengelola kategori;
* melihat alokasi;
* melihat pengajuan;
* melakukan verifikasi;
* meminta revisi;
* menolak;
* mengesahkan.

## Realisasi

Dapat:

* melihat seluruh realisasi;
* melihat bukti;
* review realisasi.

## Reports

Dapat:

* generate;
* filter;
* export PDF;
* export Excel.

## Administration

Dapat:

* user management;
* role/permission;
* settings;
* master data;
* audit log.

---

# 8. ROLE — BENDAHARA

Bendahara fokus pada finance dan budgeting.

Dapat:

### Dashboard

Melihat:

* saldo kas;
* iuran diterima;
* tunggakan;
* anggaran;
* realisasi;
* pengajuan;
* aktivitas keuangan terakhir.

### Iuran

* generate iuran;
* iuran bulanan;
* iuran jalan;
* melihat tunggakan;
* mencatat pembayaran.

### Kas

* mencatat dana masuk;
* mencatat dana keluar;
* melihat ledger;
* melihat saldo.

### Anggaran

* melihat periode;
* membuat alokasi;
* melihat sisa anggaran.

### Pengajuan

* membuat pengajuan;
* menyimpan draft;
* mengubah draft;
* mengirim pengajuan;
* melihat status;
* mengunggah dokumen.

### Realisasi

* mencatat realisasi;
* upload nota;
* upload dokumentasi.

### Laporan

* laporan keuangan;
* laporan iuran;
* laporan pengajuan;
* laporan realisasi;
* export.

Bendahara tidak boleh mengubah record yang sudah berstatus `SAH`.

---

# 9. ROLE — PETUGAS LAPANGAN

Petugas difokuskan pada aktivitas lapangan.

Dapat:

* melihat dashboard petugas;
* melihat tugas;
* melihat blok yang ditugaskan;
* melihat peta;
* melihat detail blok;
* melakukan pemeriksaan;
* mengambil GPS;
* mengambil foto;
* upload foto;
* menyimpan draft;
* mengirim data;
* melihat excavator;
* update excavator jika diberi izin;
* menginput pekerja;
* mengirim informasi;
* melihat informasi sendiri;
* melihat balasan;
* update tugas;
* mengubah profile.

Petugas tidak boleh mengakses:

* saldo kas organisasi;
* semua transaksi;
* seluruh iuran;
* budgeting organisasi;
* approval dana;
* realisasi global;
* audit global;
* user management.

---

# 10. MOBILE NAVIGATION

Navigation tidak boleh memiliki terlalu banyak bottom tabs.

## Petugas

```text
Beranda
Blok
Input
Informasi
Profil
```

Button `Input` membuka Bottom Sheet:

```text
Pemeriksaan
Excavator
Pekerja
Informasi
```

---

# 10.1 Bendahara

```text
Beranda
Keuangan
Pengajuan
Laporan
Profil
```

---

# 10.2 Admin/Pimpinan

```text
Beranda
Monitor
Keuangan
Informasi
Profil
```

Fitur lanjutan:

* anggaran;
* realisasi;
* laporan;
* user;
* audit;

ditampilkan melalui menu/shortcut.

---

# 11. AUTHENTICATION

## Login Form

Field:

| Field            | Component        |
| ---------------- | ---------------- |
| Email / Username | TextInput        |
| Password         | Secure TextInput |
| Remember Session | Switch/Checkbox  |

Features:

* login;
* logout;
* forgot password;
* reset password;
* session validation;
* inactive account blocking;
* role based navigation.

Token wajib disimpan pada:

```text
Expo SecureStore
```

Token tidak boleh disimpan di AsyncStorage.

---

# 12. DASHBOARD ADMIN

Dashboard menampilkan KPI:

* total blok;
* blok aktif;
* berhenti;
* belum operasi;
* prioritas;
* excavator aktif;
* excavator rusak;
* pekerja;
* iuran diterima;
* tunggakan;
* saldo;
* alokasi;
* realisasi;
* serapan;
* informasi baru;
* insiden urgent;
* pengajuan pending.

## Perlu Perhatian

Auto-generated dari:

* tunggakan;
* blok berhenti;
* excavator rusak;
* insiden urgent;
* pengajuan pending;
* pemeriksaan overdue.

Dashboard wajib mempunyai:

* loading skeleton;
* pull to refresh;
* period selector;
* error state;
* offline/cached state.

---

# 13. DASHBOARD BENDAHARA

Menampilkan:

* saldo kas;
* iuran diterima;
* tunggakan;
* alokasi periode;
* realisasi;
* pengajuan pending.

Aktivitas terbaru:

* pembayaran;
* transaksi masuk;
* transaksi keluar;
* pengajuan;
* realisasi;
* perubahan status.

---

# 14. DASHBOARD PETUGAS

Menampilkan:

## Ringkasan

* jumlah blok tugas;
* pemeriksaan hari ini;
* excavator aktif;
* informasi hari ini.

## Tugas Saya

Status:

```text
TODO
IN_PROGRESS
DONE
CANCELLED
```

## Quick Action

* pemeriksaan;
* peta;
* excavator;
* pekerja;
* kirim informasi.

---

# 15. MODUL BLOK

## Block List

Data:

* foto;
* kode;
* nama;
* pengelola;
* status;
* prioritas;
* excavator;
* lokasi;
* update terakhir.

Features:

* search;
* filter;
* pagination;
* pull to refresh.

Filter:

* status;
* prioritas;
* pengelola;
* excavator.

---

# 15.1 FORM BLOK

| Field         | Component         |
| ------------- | ----------------- |
| Kode Blok     | TextInput         |
| Nama Blok     | TextInput         |
| Pengelola     | Searchable Select |
| PJ Lokasi     | Select            |
| PJ Lapangan   | Select            |
| Nomor Kontak  | Phone Input       |
| Status        | Select            |
| Prioritas     | Select            |
| Luas Area     | Decimal Input     |
| Satuan        | Select            |
| Tanggal Mulai | Date Picker       |
| Alamat        | TextArea          |
| RT / Wilayah  | TextInput         |
| Latitude      | Auto              |
| Longitude     | Auto              |
| Ambil Lokasi  | GPS Button        |
| Pilih Lokasi  | Map Picker        |
| Keterangan    | TextArea          |
| Foto Lokasi   | Camera/Gallery    |

Status:

```text
ACTIVE
TEMPORARY_STOPPED
STOPPED
NOT_STARTED
```

Prioritas:

```text
NORMAL
PRIORITY
HIGH
```

Status dan prioritas wajib menjadi field berbeda.

---

# 16. PETA BLOK

Menggunakan:

```text
react-native-maps
```

Fitur:

* marker;
* marker berdasarkan status;
* clustering jika diperlukan;
* search;
* filter;
* current location;
* recenter;
* zoom;
* map callout;
* buka detail blok.

Callout:

```text
Nama Blok
Status
Pengelola
Excavator
Pekerja
Update Terakhir
```

---

# 17. DETAIL BLOK

Screen menggunakan sections/tabs:

```text
Ringkasan
Operasional
Excavator
Pekerja
Pemeriksaan
Informasi
Dokumentasi
Riwayat
```

## Ringkasan

* foto;
* kode;
* nama;
* pengelola;
* PJ;
* kontak;
* status;
* prioritas;
* luas;
* tanggal mulai;
* GPS.

## Operasional

* jumlah pekerja;
* jumlah excavator;
* jam operasional;
* kondisi terakhir;
* pemeriksaan terakhir.

---

# 18. PEMERIKSAAN LAPANGAN

Workflow:

```text
DRAFT
↓
SUBMITTED
```

Input harus menggunakan multi-step form.

---

# 18.1 STEP 1 — INFORMASI DASAR

| Field        | Component         |
| ------------ | ----------------- |
| Blok         | Searchable Select |
| Tanggal      | Date Picker       |
| Waktu        | Time Picker       |
| GPS          | Auto              |
| Ambil Lokasi | GPS Button        |

---

# 18.2 STEP 2 — KONDISI

| Field              | Component      |
| ------------------ | -------------- |
| Kondisi Blok       | Select         |
| Jumlah Excavator   | Number Stepper |
| Jumlah Pekerja     | Number Stepper |
| Kondisi Jalan      | Select         |
| Kondisi Lingkungan | Select         |
| Kondisi Kegiatan   | Select         |
| Temuan             | TextArea       |
| Catatan            | TextArea       |

---

# 18.3 STEP 3 — DOKUMENTASI

Button:

```text
+ Tambah Dokumentasi
```

Bottom Sheet:

```text
Ambil Foto
Pilih dari Galeri
```

Features:

* multiple image;
* preview;
* remove;
* replace;
* retake.

Recommended:

```text
Minimum: 1 foto
Maximum: configurable 5–10 foto
```

---

# 18.4 STEP 4 — REVIEW

Tampilkan:

* blok;
* tanggal;
* waktu;
* GPS;
* kondisi;
* jumlah pekerja;
* jumlah excavator;
* temuan;
* foto.

Actions:

```text
Simpan Draft
Kirim Pemeriksaan
```

---

# 19. GPS

Simpan:

```text
latitude
longitude
accuracy
captured_at
```

Tampilkan kualitas GPS:

```text
Lokasi ditemukan
Akurasi ±8 meter
```

Jika akurasi buruk:

```text
Akurasi lokasi rendah.
Silakan coba kembali di area terbuka.
```

GPS tidak boleh mengandalkan string alamat saja.

---

# 20. CAMERA & IMAGE QUALITY

Foto dari camera tidak boleh langsung diupload dalam ukuran original.

Flow:

```text
Camera
↓
Resize
↓
Compress
↓
Upload Queue
↓
Server
```

Target resolusi yang disarankan:

```text
Max dimension sekitar 1600px
```

Target size:

```text
±300 KB – 1 MB
```

tergantung dokumentasi.

Mobile tidak menggunakan konsep drag-and-drop/dropzone.

---

# 21. EXCAVATOR

## List

Data:

* kode;
* brand;
* model;
* nomor unit;
* operator;
* blok;
* status;
* jam operasional;
* tanggal masuk;
* update terakhir.

Status:

```text
ACTIVE
DAMAGED
INACTIVE
EXITED
```

---

# 21.1 FORM EXCAVATOR

| Field           | Component         |
| --------------- | ----------------- |
| Blok            | Searchable Select |
| Kode Unit       | TextInput         |
| Brand           | Select/Text       |
| Model           | TextInput         |
| Serial          | TextInput         |
| Operator        | Select/Text       |
| Status          | Select            |
| Tanggal Masuk   | Date              |
| Jam Operasional | Decimal           |
| Kondisi         | Select            |
| Catatan         | TextArea          |
| Foto            | Camera/Gallery    |

---

# 21.2 UPDATE EXCAVATOR

Dapat mencatat:

* status;
* operator;
* hour meter;
* kondisi;
* catatan;
* foto.

Jika keluar:

* tanggal keluar;
* alasan;
* catatan.

Setiap perubahan menghasilkan histori.

---

# 22. PEKERJA

## List

Menampilkan:

* nama;
* blok;
* jabatan;
* status;
* tanggal mulai.

## Form

| Field         | Component         |
| ------------- | ----------------- |
| Nama          | TextInput         |
| Blok          | Searchable Select |
| Jabatan       | Select/Text       |
| No HP         | Phone Input       |
| Tanggal Mulai | Date              |
| Status        | Select            |
| Catatan       | TextArea          |
| Foto          | Camera/Gallery    |

Status:

```text
ACTIVE
INACTIVE
```

---

# 23. INFORMASI LAPANGAN

Jenis:

```text
ACTIVITY
COMPLAINT
INCIDENT
NOTICE
INFORMATION
```

UI:

```text
Kegiatan
Keluhan
Insiden
Pemberitahuan
Informasi Lainnya
```

---

# 23.1 FORM INFORMASI

| Field     | Component         |
| --------- | ----------------- |
| Jenis     | Radio Cards       |
| Blok      | Searchable Select |
| Judul     | TextInput         |
| Uraian    | TextArea          |
| Lokasi    | TextInput         |
| GPS       | Location Button   |
| Prioritas | Select            |
| Foto      | Camera/Gallery    |
| Waktu     | Automatic         |

Prioritas:

```text
NORMAL
IMPORTANT
URGENT
```

Workflow:

```text
DRAFT
↓
SENT
↓
READ
↓
RESPONDED
↓
RESOLVED
```

---

# 24. INFORMASI SAYA

Tabs:

```text
Dikirim
Dibalas
```

Menampilkan:

* judul;
* type;
* status;
* tanggal;
* blok;
* prioritas;
* reply.

Ketika Admin membalas:

```text
Push Notification
→ Detail Informasi
```

---

# 25. IURAN

Jenis:

```text
MONTHLY
ROAD
```

Setiap kewajiban mempunyai:

* periode;
* blok;
* pengelola;
* amount due;
* amount paid;
* remaining;
* due date;
* status.

Status:

```text
UNPAID
PARTIAL
PAID
OVERDUE
```

---

# 25.1 GENERATE IURAN

| Field       | Component      |
| ----------- | -------------- |
| Periode     | Month Picker   |
| Blok        | Multi Select   |
| Jenis       | Select         |
| Nominal     | Currency Input |
| Jatuh Tempo | Date           |
| Catatan     | TextArea       |

Unique business constraint:

```text
block_id
+
due_type
+
year
+
month
```

tidak boleh duplicate.

---

# 26. PEMBAYARAN

Form:

| Field          | Component      |
| -------------- | -------------- |
| Blok/Pengelola | Search         |
| Kewajiban      | Select         |
| Tanggal        | Date           |
| Nominal        | Currency       |
| Metode         | Select         |
| Referensi      | TextInput      |
| Catatan        | TextArea       |
| Bukti          | Camera/Gallery |

Metode:

```text
CASH
TRANSFER
QRIS
OTHER
```

Status dihitung otomatis:

```text
amount_paid = 0
→ UNPAID

amount_paid < amount_due
→ PARTIAL

amount_paid >= amount_due
→ PAID
```

---

# 27. CASH LEDGER

Jenis:

```text
IN
OUT
```

## Transaksi Masuk

* tanggal;
* kategori;
* nominal;
* sumber;
* deskripsi;
* lampiran.

## Transaksi Keluar

* tanggal;
* kategori;
* nominal;
* tujuan;
* deskripsi;
* lampiran.

Saldo tidak boleh diedit manual.

Formula:

```text
Saldo Awal
+ Total IN
- Total OUT
= Saldo Aktual
```

---

# 28. ANGGARAN

## Periode Anggaran

Data:

* bulan;
* tahun;
* total budget;
* status.

Status:

```text
DRAFT
ACTIVE
CLOSED
```

---

# 28.1 KATEGORI ANGGARAN

Kategori tidak boleh hardcoded.

Contoh:

* Infrastruktur;
* Operasional;
* Ketertiban;
* Sosial;
* Belanja Tidak Terduga;
* Cadangan.

Admin dapat mengatur kategori.

Fields:

* code;
* name;
* parent/subcategory;
* description;
* active.

---

# 28.2 ALOKASI

Form:

| Field       | Component   |
| ----------- | ----------- |
| Periode     | Month       |
| Kategori    | Select      |
| Subkategori | Select      |
| Nominal     | Currency    |
| Keterangan  | TextArea    |
| Lampiran    | File/Camera |

Validation:

```text
Total Allocations <= Total Budget
```

---

# 29. PENGAJUAN DANA

Workflow:

```text
DRAFT
↓
SUBMITTED
↓
VERIFIED
↓
APPROVED / SAH
```

Alternative:

```text
SUBMITTED
→ REVISION_REQUIRED

SUBMITTED
→ REJECTED

VERIFIED
→ REVISION_REQUIRED
```

---

# 29.1 FORM PENGAJUAN

| Field           | Component       |
| --------------- | --------------- |
| Nomor Pengajuan | Automatic       |
| Periode         | Month Picker    |
| Tanggal         | Date            |
| Kategori        | Select          |
| Subkategori     | Select          |
| Blok            | Optional Select |
| Judul           | TextInput       |
| Uraian          | TextArea        |
| Jumlah          | Currency        |
| Lampiran        | File/Gallery    |
| Catatan         | TextArea        |

---

# 29.2 ACTION BERDASARKAN STATUS

## Draft

```text
Edit
Simpan
Hapus Draft
Ajukan
```

## Submitted

```text
View
Cancel jika diizinkan
```

## Verified

```text
View
```

## SAH

```text
Read Only
```

---

# 30. VERIFIKASI

Pimpinan/Admin melihat:

* nomor;
* pemohon;
* periode;
* kategori;
* anggaran tersedia;
* nominal;
* uraian;
* lampiran;
* status history.

Form:

| Field     | Component      |
| --------- | -------------- |
| Keputusan | Action Buttons |
| Catatan   | TextArea       |

Actions:

```text
Verifikasi
Minta Revisi
Tolak
```

---

# 31. PENGESAHAN

Pimpinan melakukan:

```text
VERIFIED
↓
APPROVED / SAH
```

Setelah SAH:

* record terkunci;
* nilai utama tidak dapat diubah;
* tidak dapat dihapus;
* koreksi menggunakan correction/reversal;
* tercatat audit.

---

# 32. REALISASI

Form:

| Field       | Component           |
| ----------- | ------------------- |
| Periode     | Month               |
| Alokasi     | Select              |
| Pengajuan   | Optional Select     |
| Kategori    | Auto                |
| Kegiatan    | TextInput           |
| Tanggal     | Date                |
| Nominal     | Currency            |
| Uraian      | TextArea            |
| Bukti Nota  | Camera/Gallery/File |
| Dokumentasi | Multiple Images     |
| Catatan     | TextArea            |

Server wajib memastikan:

```text
SUM(realization.amount)
<=
allocation.amount
```

---

# 33. LAPORAN

Jenis:

1. Laporan Keuangan.
2. Laporan Iuran.
3. Laporan Blok.
4. Laporan Pemeriksaan.
5. Laporan Excavator.
6. Laporan Pekerja.
7. Laporan Pengajuan.
8. Laporan Realisasi.
9. Laporan Informasi.

Filter:

* tanggal;
* bulan;
* tahun;
* date range;
* blok;
* pengelola;
* kategori;
* status.

Actions:

```text
Generate
Export PDF
Export Excel
Share
```

PDF/XLSX sebaiknya dibuat oleh backend.

Mobile menerima:

```text
download_url
```

kemudian dapat:

* preview;
* download;
* share.

---

# 34. NOTIFICATIONS

Notification events:

* tugas baru;
* pemeriksaan submitted;
* informasi baru;
* insiden urgent;
* informasi dibalas;
* pembayaran;
* tunggakan;
* pengajuan baru;
* revision request;
* pengajuan verified;
* pengajuan approved;
* pengajuan rejected;
* realisasi baru;
* excavator rusak;
* status blok berubah.

Notification harus:

* read/unread;
* mark as read;
* mark all;
* deep link.

Contoh:

```text
Pemeriksaan Baru

Petugas 01 mengirim pemeriksaan
Blok 07.

[Lihat Pemeriksaan]
```

Tap notification harus membuka record terkait.

---

# 35. OFFLINE SUPPORT

Offline support merupakan requirement utama terutama untuk Petugas Lapangan.

## Offline-capable

* pemeriksaan;
* draft informasi;
* foto;
* GPS;
* tugas yang sudah cached;
* block data cached.

Finance dan approval sensitif sebaiknya membutuhkan koneksi online.

---

# 35.1 LOCAL DATABASE

Gunakan:

```text
Expo SQLite
```

Untuk:

* drafts;
* cached blocks;
* cached master data;
* pending mutations;
* pending media;
* sync metadata.

---

# 35.2 OUTBOX PATTERN

Local table:

```text
sync_outbox

id
entity_type
entity_local_id
operation
payload
status
retry_count
created_at
last_attempt_at
```

Status:

```text
PENDING
SYNCING
SYNCED
FAILED
```

Flow:

```text
User Submit
↓
Internet?

YES
→ API
→ success

NO
→ SQLite Outbox
→ PENDING
→ wait network
→ background/foreground sync
→ API
→ SYNCED
```

---

# 35.3 SYNC UI

Tampilkan indicator:

```text
Tersimpan sebagai Draft
```

```text
Menunggu sinkronisasi
```

```text
Sedang mengirim
```

```text
Tersinkron
```

```text
Gagal sinkronisasi
[Coba Lagi]
```

User tidak boleh menebak apakah data sudah masuk server.

---

# 36. IDEMPOTENCY

Mutation penting wajib menggunakan:

```text
Idempotency-Key
```

Minimal untuk:

* pemeriksaan;
* informasi;
* pembayaran;
* pengajuan;
* realisasi.

Tujuannya mencegah duplicate ketika koneksi lambat menyebabkan retry.

---

# 37. AUTOSAVE

Form panjang harus autosave.

Contoh:

```text
Input berubah
↓
debounce ±750ms
↓
SQLite Draft
```

Ketika aplikasi dibuka kembali:

```text
Anda memiliki pemeriksaan yang belum selesai.

[Lanjutkan]
[Buang Draft]
```

---

# 38. MOBILE UX STANDARD

Setiap screen data harus memiliki minimal:

```text
Loading
Success
Empty
Error
Offline
```

## Loading

Gunakan Skeleton.

## Empty

Contoh:

```text
Belum ada pemeriksaan.
```

## Error

```text
Data gagal dimuat.

[Coba Lagi]
```

## Offline

```text
Anda sedang offline.
Menampilkan data terakhir.
```

---

# 39. DESIGN SYSTEM

Tidak boleh melakukan styling random per screen.

Gunakan:

```text
theme/
├── colors.ts
├── typography.ts
├── spacing.ts
├── radius.ts
├── shadows.ts
└── dimensions.ts
```

Komponen standar:

```text
Button
IconButton
Card
Badge
Input
CurrencyInput
Select
SearchSelect
TextArea
RadioCard
Switch
DatePicker
MonthPicker
BottomSheet
Modal
Skeleton
EmptyState
ErrorState
OfflineBanner
SyncBadge
ImagePicker
CameraPicker
LocationPicker
SearchBar
FilterSheet
```

---

# 40. UI QUALITY REQUIREMENTS

Mobile app harus mempunyai:

* Safe Area handling.
* Keyboard Avoiding View.
* Minimum touch target ±44px.
* Consistent spacing.
* Consistent typography.
* Consistent status colors.
* Haptic feedback pada action tertentu.
* Pull-to-refresh.
* Skeleton loaders.
* Toast/snackbar feedback.
* Confirmation untuk destructive action.
* Bottom Sheet untuk contextual actions.
* Sticky action pada form panjang.
* List virtualization.

Jangan membuat mobile UI hanya sebagai versi kecil dari desktop dashboard.

---

# 41. SERVER STATE MANAGEMENT

TanStack Query digunakan untuk:

* blocks;
* inspections;
* excavators;
* workers;
* information;
* finance;
* budgets;
* requests;
* realization;
* notifications.

Zustand tidak digunakan sebagai database server state.

Zustand hanya untuk:

* authenticated user context;
* UI preferences;
* temporary selections;
* draft wizard UI.

---

# 42. CACHE STRATEGY

Suggested:

```text
Dashboard
30–60 seconds

Notifications
30–60 seconds

Blocks
2–5 minutes

Block Detail
2–5 minutes

Master Data
30 minutes
```

Gunakan:

* staleTime;
* invalidateQueries;
* refetchOnFocus;
* pull-to-refresh.

Hindari refetch semua endpoint setiap screen dibuka.

---

# 43. NEAR REAL-TIME STRATEGY

Karena backend berada pada cPanel, tidak perlu WebSocket pada versi awal.

Gunakan kombinasi:

```text
TanStack Query
+
Polling terkontrol
+
Refetch on App Focus
+
Mutation Invalidation
+
Push Notification
```

Contoh:

Dashboard:

```text
poll ±30–60 detik
```

Informasi urgent:

```text
Push Notification
```

Hasilnya cukup real-time tanpa mempersulit deployment.

---

# 44. API STANDARD

Base:

```text
/api/v1/
```

Response success:

```json
{
  "data": {},
  "message": "Success"
}
```

Validation:

```json
{
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "errors": {
    "field": [
      "Error message"
    ]
  }
}
```

Pagination:

```json
{
  "data": [],
  "meta": {
    "current_page": 1,
    "last_page": 10,
    "per_page": 20,
    "total": 200
  }
}
```

---

# 45. API GROUPS

```text
/api/v1/auth/*
/api/v1/users/*
/api/v1/dashboard/*
/api/v1/tasks/*
/api/v1/blocks/*
/api/v1/inspections/*
/api/v1/excavators/*
/api/v1/workers/*
/api/v1/information/*
/api/v1/finance/*
/api/v1/budgets/*
/api/v1/fund-requests/*
/api/v1/realizations/*
/api/v1/reports/*
/api/v1/notifications/*
/api/v1/audit/*
```

Gunakan noun-based REST route.

Hindari:

```text
/getData
/getAllBlock
/createNewBlockData
/updateDataBlock
```

---

# 46. API CONTRACT

Repository wajib mempunyai:

```text
contracts/openapi.yaml
```

Digunakan sebagai contract antara:

```text
Laravel API
↕
React Native
```

TypeScript API type sebaiknya digenerate dari OpenAPI.

Tujuannya mencegah:

* mismatch enum;
* typo field;
* backend/mobile type drift;
* API undocumented.

---

# 47. DATABASE ENTITIES

Minimum tables:

```text
roles
permissions
role_permissions
users

blocks
user_block_assignments
block_status_histories
block_photos

field_tasks

block_inspections
inspection_photos

excavators
excavator_block_assignments
excavator_histories

workers
worker_block_assignments

daily_information
daily_information_photos
information_replies

dues
due_payments

finance_categories
cash_transactions

budget_periods
budget_categories
budget_allocations

fund_requests
fund_request_attachments
fund_request_status_histories

budget_realizations
realization_attachments

notifications

audit_logs

idempotency_keys
```

---

# 48. DATABASE PRINCIPLES

Primary keys:

```text
BIGINT
```

Timestamp:

```text
created_at
updated_at
```

Soft delete hanya digunakan pada master/entity tertentu.

Financial records tidak boleh hard delete.

Gunakan:

```text
DECIMAL(18,2)
```

untuk currency.

Jangan menggunakan:

```text
FLOAT
```

untuk nilai rupiah.

---

# 49. CRITICAL DATABASE INDEXES

Minimal:

```text
users(email)
users(role_id)

blocks(code)
blocks(operational_status)
blocks(priority_level)

block_inspections(block_id, inspection_date)
block_inspections(inspector_id)

excavator_block_assignments(block_id, status)

worker_block_assignments(block_id, is_active)

daily_information(block_id, created_at)
daily_information(type, status)
daily_information(priority)

dues(block_id, year, month)
dues(status)

due_payments(due_id, payment_date)

cash_transactions(transaction_date)
cash_transactions(transaction_type)

budget_allocations(budget_period_id, category_id)

fund_requests(status)
fund_requests(budget_period_id)

budget_realizations(budget_allocation_id)

notifications(user_id, is_read, created_at)

audit_logs(entity_type, entity_id)
audit_logs(user_id, created_at)
```

---

# 50. FINANCIAL TRANSACTION RULE

Mencatat pembayaran harus atomic.

Flow:

```text
BEGIN TRANSACTION

create due_payment

update amount_paid

update due_status

create cash_transaction IN

create audit_log

COMMIT
```

Jika satu tahap gagal:

```text
ROLLBACK
```

Tidak boleh muncul kondisi:

```text
payment tercatat
tapi kas tidak bertambah
```

atau sebaliknya.

---

# 51. BUSINESS RULE — FINANCIAL DATA

Record berikut tidak boleh hard delete setelah posted/final:

* pembayaran;
* transaksi kas;
* alokasi final;
* pengajuan SAH;
* realisasi.

Jika salah:

```text
Correction
atau
Reversal
```

bukan overwrite history.

---

# 52. AUDIT TRAIL

Audit log menyimpan:

* actor/user;
* action;
* entity;
* entity ID;
* previous value;
* new value;
* timestamp;
* IP;
* device/user agent bila tersedia.

Event minimum:

```text
CREATE
UPDATE
DELETE
SUBMIT
VERIFY
APPROVE
REJECT
CANCEL
REVERSAL
LOGIN
EXPORT
```

Audit log tidak boleh dapat diedit oleh user.

---

# 53. SECURITY

Backend wajib menjadi authority.

Menyembunyikan menu di React Native **bukan authorization**.

Laravel harus melakukan:

```text
Authentication
↓
Permission Check
↓
Resource Access Check
↓
Validation
↓
Business Rule
```

Security minimum:

* password hashing;
* Sanctum token;
* token expiration/revocation;
* HTTPS;
* authorization policies;
* validation;
* SQL injection protection;
* rate limiting;
* MIME validation;
* file size validation;
* randomized upload filename;
* permission per block;
* audit log;
* production `APP_DEBUG=false`.

---

# 54. FILE SECURITY

Allowed images:

```text
JPEG
PNG
WebP
```

Document:

```text
PDF
JPEG
PNG
```

Backend harus melakukan:

* MIME validation;
* size validation;
* extension validation;
* randomized filename;
* reject executable files.

Original user filename hanya metadata, bukan storage key.

---

# 55. REACT NATIVE CODEBASE

Repository:

```text
satgas-desa-sejoli/
│
├── apps/
│   ├── mobile/
│   └── api/
│
├── contracts/
│   └── openapi.yaml
│
├── docs/
└── README.md
```

---

# 56. MOBILE STRUCTURE

Gunakan **feature-first architecture**.

```text
apps/mobile/
│
├── app/
│   ├── (auth)/
│   └── (app)/
│       ├── admin/
│       ├── bendahara/
│       └── petugas/
│
├── src/
│   │
│   ├── core/
│   │   ├── api/
│   │   ├── auth/
│   │   ├── database/
│   │   ├── sync/
│   │   ├── storage/
│   │   ├── network/
│   │   ├── camera/
│   │   ├── location/
│   │   ├── notifications/
│   │   └── errors/
│   │
│   ├── features/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── tasks/
│   │   ├── blocks/
│   │   ├── inspections/
│   │   ├── excavators/
│   │   ├── workers/
│   │   ├── information/
│   │   ├── finance/
│   │   ├── budgets/
│   │   ├── fund-requests/
│   │   ├── realizations/
│   │   ├── reports/
│   │   ├── notifications/
│   │   └── profile/
│   │
│   ├── shared/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── utils/
│   │   └── theme/
│   │
│   ├── config/
│   └── types/
│
└── assets/
```

---

# 57. FEATURE STRUCTURE

Contoh:

```text
features/inspections/
│
├── api/
├── components/
├── forms/
├── hooks/
├── screens/
├── schemas/
├── types/
├── constants/
└── utils/
```

Semua logic pemeriksaan berada dalam feature tersebut.

Developer yang mendapatkan bug pemeriksaan tidak perlu mencari ke seluruh codebase.

---

# 58. ROUTE FILE RULE

File dalam:

```text
app/
```

hanya bertugas routing/navigation.

Contoh:

```tsx
export { default }
  from "@/features/inspections/screens/CreateInspectionScreen";
```

Jangan memasukkan business logic besar ke route.

---

# 59. BACKEND CODEBASE

```text
apps/api/
│
├── app/
│   ├── Domain/
│   │   ├── Blocks/
│   │   ├── Inspections/
│   │   ├── Excavators/
│   │   ├── Workers/
│   │   ├── Information/
│   │   ├── Finance/
│   │   ├── Budgets/
│   │   ├── FundRequests/
│   │   ├── Realizations/
│   │   ├── Notifications/
│   │   └── Reports/
│   │
│   ├── Http/
│   │   ├── Controllers/
│   │   ├── Requests/
│   │   ├── Resources/
│   │   └── Middleware/
│   │
│   ├── Policies/
│   └── Support/
│
├── database/
│   ├── migrations/
│   ├── factories/
│   └── seeders/
│
├── routes/
│   └── api.php
│
└── tests/
```

Controller harus tipis.

Business logic masuk ke:

```text
Action
Service
Query
Domain
```

---

# 60. DATA FLOW STANDARD

```text
SCREEN
↓
HOOK
↓
QUERY / MUTATION
↓
API CLIENT
↓
LARAVEL CONTROLLER
↓
ACTION / SERVICE
↓
MODEL
↓
MYSQL
```

Flow harus konsisten pada semua module.

---

# 61. DEVELOPMENT ENVIRONMENT

Minimum environment:

```text
development
staging
production
```

Mobile API URLs:

```text
development
→ dev-api...

staging
→ staging-api...

production
→ api...
```

Jangan mengembangkan fitur menggunakan database production.

---

# 62. CPANEL DEPLOYMENT

Recommended structure:

```text
/home/account/apps/satgas-api/
```

Document Root:

```text
/home/account/apps/satgas-api/public
```

API:

```text
https://api.domain.com
```

`.env` production:

```text
APP_ENV=production
APP_DEBUG=false

DB_CONNECTION=mysql
DB_HOST=localhost
DB_DATABASE=...
DB_USERNAME=...
DB_PASSWORD=...
```

---

# 63. DATABASE MIGRATION

Database schema wajib dibuat melalui:

```text
database/migrations/
```

Bukan melalui perubahan manual phpMyAdmin.

Developer harus dapat menjalankan:

```bash
php artisan migrate
```

untuk mendapatkan schema terbaru.

---

# 64. SEEDERS

Minimum:

```text
RoleSeeder
PermissionSeeder
AdminSeeder
BudgetCategorySeeder
FinanceCategorySeeder
```

Development:

```text
DemoUserSeeder
DemoBlockSeeder
DemoInspectionSeeder
```

Tidak perlu memberikan production database dump ke developer hanya untuk development.

---

# 65. CPANEL CRON

Scheduler:

```bash
php artisan schedule:run
```

dijalankan melalui Cron Job.

Queue pada shared cPanel tidak boleh mengasumsikan Supervisor tersedia.

Jika membutuhkan queue:

```text
database queue
+
periodic queue worker
```

Jobs:

* push notification;
* report generation;
* image processing;
* maintenance tasks.

---

# 66. PERFORMANCE

Target minimum:

### API

Common request:

```text
< 500–800 ms
```

pada beban normal.

### Mobile

Target:

* dashboard terasa usable <3 detik pada network normal;
* list menggunakan pagination;
* image lazy loading;
* thumbnails;
* optimized upload;
* no unnecessary rerender;
* no full-list ScrollView.

Gunakan virtualized list / FlashList untuk data panjang.

---

# 67. SEARCH

Search harus menggunakan debounce:

```text
300–500 ms
```

Jangan melakukan API request setiap karakter tanpa debounce.

Modules:

* blocks;
* excavators;
* workers;
* payments;
* requests;
* information.

---

# 68. ERROR HANDLING

Global mapping:

```text
401
→ session expired

403
→ permission denied

404
→ data not found

422
→ form validation

429
→ rate limited

500
→ server error

network failure
→ offline handler
```

Tidak boleh masing-masing screen mempunyai implementasi error sendiri yang berbeda.

---

# 69. SENTRY & LOGGING

Mobile harus merekam:

* unhandled exception;
* application crash;
* unexpected API error;
* sync failure.

Laravel log untuk:

* exceptions;
* report failures;
* integration errors;
* sync issues.

Jangan pernah log:

* password;
* token;
* sensitive credentials.

---

# 70. TESTING

## Mobile Critical Tests

Prioritaskan:

* login;
* authorization;
* form validation;
* draft inspection;
* offline queue;
* sync;
* payment validation;
* fund request workflow.

## Backend Critical Tests

Wajib menguji:

### Authorization

```text
Petugas tidak dapat approve pengajuan.
```

### Financial Lock

```text
Bendahara tidak dapat mengubah transaksi SAH.
```

### Payment

```text
Pembayaran tidak duplicate.
```

### Budget

```text
Realisasi tidak melebihi alokasi.
```

### Idempotency

```text
Request dengan key sama
tidak membuat record kedua.
```

---

# 71. CODE QUALITY

Mobile:

```text
TypeScript strict = true
```

Dilarang menggunakan `any` tanpa alasan.

CI/local checks:

```text
lint
typecheck
test
```

Backend:

```text
php artisan test
```

PR tidak dianggap selesai jika:

* TypeScript error;
* lint error;
* critical test gagal.

---

# 72. NAMING CONVENTION

React:

```text
BlockCard.tsx
InspectionForm.tsx
CreateInspectionScreen.tsx
```

Hooks:

```text
useBlocks.ts
useCreateInspection.ts
```

API:

```text
block.api.ts
inspection.api.ts
```

Schema:

```text
inspection.schema.ts
```

Hindari:

```text
helper.ts
helper2.ts
common2.ts
functions.ts
misc.ts
```

---

# 73. ACCEPTANCE CRITERIA — PETUGAS

Petugas dianggap complete apabila:

* [ ] Dapat login.
* [ ] Hanya melihat menu sesuai permission.
* [ ] Dapat melihat dashboard.
* [ ] Dapat melihat tugas.
* [ ] Dapat update tugas.
* [ ] Dapat melihat blok.
* [ ] Dapat menggunakan peta.
* [ ] Dapat membuka detail blok.
* [ ] Dapat mengambil GPS.
* [ ] Dapat membuat pemeriksaan.
* [ ] Dapat menggunakan camera.
* [ ] Dapat memilih foto dari gallery.
* [ ] Foto dikompresi.
* [ ] Dapat menyimpan Draft.
* [ ] Draft tersimpan lokal.
* [ ] Draft dapat dilanjutkan.
* [ ] Data dapat queued saat offline.
* [ ] Data dapat sync saat internet tersedia.
* [ ] User dapat melihat status sync.
* [ ] Dapat melihat excavator.
* [ ] Dapat mengelola excavator jika berizin.
* [ ] Dapat menginput pekerja.
* [ ] Dapat mengirim informasi.
* [ ] Dapat melihat informasi sendiri.
* [ ] Dapat melihat balasan Admin.
* [ ] Mendapat notifikasi terkait.

---

# 74. ACCEPTANCE CRITERIA — BENDAHARA

* [ ] Dapat login.
* [ ] Dashboard keuangan tersedia.
* [ ] Dapat melihat iuran.
* [ ] Dapat generate iuran.
* [ ] Dapat melihat iuran jalan.
* [ ] Dapat melihat tunggakan.
* [ ] Dapat mencatat pembayaran.
* [ ] Payment secara otomatis update kewajiban.
* [ ] Payment secara otomatis update cash ledger.
* [ ] Proses payment bersifat transactional.
* [ ] Dapat mencatat dana masuk.
* [ ] Dapat mencatat dana keluar.
* [ ] Saldo dihitung dari ledger.
* [ ] Dapat melihat anggaran.
* [ ] Dapat membuat alokasi.
* [ ] Dapat membuat pengajuan.
* [ ] Dapat menyimpan Draft.
* [ ] Dapat submit.
* [ ] Dapat melihat status workflow.
* [ ] Dapat mencatat realisasi.
* [ ] Dapat upload bukti.
* [ ] Dapat membuat laporan.
* [ ] Record SAH tidak dapat diedit.

---

# 75. ACCEPTANCE CRITERIA — ADMIN/PIMPINAN

* [ ] Dapat login.
* [ ] Dapat melihat semua KPI.
* [ ] Dapat melihat alert.
* [ ] Dapat melihat semua blok.
* [ ] Dapat mencari blok.
* [ ] Dapat filter blok.
* [ ] Dapat menggunakan map.
* [ ] Dapat melihat detail blok.
* [ ] Dapat melihat histori.
* [ ] Dapat melihat pemeriksaan.
* [ ] Dapat melihat dokumentasi.
* [ ] Dapat melihat excavator.
* [ ] Dapat melihat pekerja.
* [ ] Dapat membaca informasi.
* [ ] Dapat reply informasi.
* [ ] Dapat melihat keuangan.
* [ ] Dapat melihat tunggakan.
* [ ] Dapat melihat anggaran.
* [ ] Dapat melihat pengajuan.
* [ ] Dapat melakukan verifikasi.
* [ ] Dapat meminta revisi.
* [ ] Dapat menolak.
* [ ] Dapat mengesahkan.
* [ ] Dapat melihat realisasi.
* [ ] Dapat generate report.
* [ ] Dapat export PDF.
* [ ] Dapat export Excel.
* [ ] Dapat melihat audit trail.
* [ ] Dapat mengelola user.
* [ ] Dapat mengelola master data.

---

# 76. DEVELOPMENT PHASES

## Phase 1 — Foundation

```text
Expo
TypeScript
Expo Router
Design System
API Client
Auth
RBAC
React Query
SecureStore
Laravel Setup
MySQL Setup
```

---

## Phase 2 — Operational Core

```text
Dashboard
Blocks
Block Detail
Map
Inspection
GPS
Camera
Photos
```

---

## Phase 3 — Offline Architecture

```text
SQLite
Draft
Autosave
Outbox
Sync
Idempotency
Network State
```

---

## Phase 4 — Operational Expansion

```text
Tasks
Excavators
Workers
Information
Replies
Notifications
```

---

## Phase 5 — Finance

```text
Iuran
Iuran Jalan
Payments
Tunggakan
Cash Ledger
```

---

## Phase 6 — Budgeting

```text
Budget Period
Categories
Allocation
Fund Request
Verification
Approval
Realization
```

---

## Phase 7 — Reporting

```text
Reports
PDF
Excel
Audit Trail
```

---

## Phase 8 — Production Hardening

```text
Testing
Performance
Sentry
Push Notification
Security Review
Permission Audit
Image Optimization
EAS Production Build
cPanel Production Deployment
```

---

# 77. DEFINITION OF DONE

Sebuah feature tidak dianggap selesai hanya karena UI sudah tampil.

Feature dianggap `DONE` jika:

```text
UI selesai
+
Loading state
+
Empty state
+
Error state
+
Offline handling bila relevan
+
API integration
+
Server validation
+
Permission
+
Database migration
+
Audit bila diperlukan
+
Mobile validation
+
Testing critical flow
+
No TypeScript error
+
No critical lint error
```

---

# 78. FINAL ARCHITECTURAL RULES

Project harus mengikuti aturan berikut tanpa pengecualian sembarangan:

### Rule 1

Satu React Native App untuk semua role.

### Rule 2

Satu Laravel API sebagai backend.

### Rule 3

Satu MySQL database sebagai source of truth.

### Rule 4

Mobile menggunakan feature-first architecture.

### Rule 5

Backend menggunakan domain-oriented architecture.

### Rule 6

Tidak ada authorization yang hanya bergantung pada frontend.

### Rule 7

Semua business-critical validation dilakukan kembali di server.

### Rule 8

Operational field workflow harus tahan terhadap jaringan buruk.

### Rule 9

Mutation kritis menggunakan idempotency.

### Rule 10

Financial operation menggunakan database transaction.

### Rule 11

Financial history tidak dihapus atau ditimpa.

### Rule 12

Record `SAH` dikunci.

### Rule 13

Foto dioptimasi sebelum upload.

### Rule 14

Saldo dihitung dari ledger, bukan angka editable.

### Rule 15

OpenAPI menjadi kontrak resmi antara Mobile dan Backend.

### Rule 16

Database hanya dimodifikasi melalui migrations sebagai workflow development.

### Rule 17

API menggunakan versioning `/api/v1`.

### Rule 18

Tidak menggunakan WebSocket jika polling + push sudah menyelesaikan kebutuhan.

### Rule 19

Jangan menambahkan infrastructure complexity tanpa kebutuhan nyata.

### Rule 20

Maintainability, reliability, dan data integrity lebih penting daripada mengejar development tercepat.

---

# 79. FINAL SYSTEM SUMMARY

Final architecture:

```text
REACT NATIVE MOBILE APP
│
├── ADMIN / PIMPINAN
├── BENDAHARA
└── PETUGAS LAPANGAN
        │
        │ HTTPS REST API
        ▼
LARAVEL API
        │
        ├── Authentication
        ├── Permission
        ├── Validation
        ├── Business Logic
        ├── Transactions
        ├── Reports
        ├── Notifications
        └── Audit
        │
        ▼
MYSQL 8
        │
        ├── Operational Data
        ├── Financial Data
        ├── Budgeting Data
        └── Management Data
```

Field operation:

```text
Mobile
→ Draft
→ SQLite
→ Camera/GPS
→ Outbox
→ Sync
→ Laravel
→ MySQL
```

Financial operation:

```text
Mobile
→ Laravel Validation
→ Permission
→ Database Transaction
→ Ledger
→ Audit
→ MySQL
```

Fund workflow:

```text
DRAFT
→ SUBMITTED
→ VERIFIED
→ APPROVED / SAH
→ REALIZATION
```

Secara produk, SATGAS Desa Sejoli bukan sekadar aplikasi form mobile.

Produk final merupakan **Mobile Operational Management System** yang mengintegrasikan:

```text
Field Operations
+
Asset Monitoring
+
Workforce
+
Incident & Information Management
+
Financial Management
+
Budget Management
+
Approval Workflow
+
Reporting
+
Audit
```

dalam satu React Native application dengan Laravel + MySQL sebagai backend production di cPanel.
