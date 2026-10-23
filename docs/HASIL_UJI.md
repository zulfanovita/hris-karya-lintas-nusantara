# Hasil Uji Aturan Bisnis

Uji dijalankan **langsung pada database** (PostgreSQL 16 + RLS + fungsi bisnis dari `supabase/migrations/001_skema.sql`), dengan memuat **seluruh data contoh klien** (`Data_Contoh_HRIS.xlsx`: 16 karyawan, 37 pengajuan, 278 absensi, 39 slip). Setiap uji meniru login Supabase (`request.jwt.claim.sub` + role `authenticated`), sehingga RLS dan hak akses benar-benar berlaku, sama seperti saat aplikasi memanggil API.

**Ringkasan: 46 dari 46 uji lulus.** (Syarat PRD: minimal 10.)

Cara mengulang: `DB="psql -h HOST -U postgres NAMADB" ./supabase/tests/jalankan_uji.sh` (butuh database yang sudah berisi skema + data contoh; skrip memakai tanggal relatif terhadap hari ini, kecuali kasus yang memang bertanggal tetap pada data contoh).

| Kode | Aturan / skenario | Hasil | Keterangan |
|---|---|---|---|
| TC-01 | BR-01 akun nonaktif tidak bisa melakukan aksi (Bambang) | ✅ LULUS | ditolak: Akun tidak aktif |
| TC-02 | BR-01 HRD tidak boleh menonaktifkan akunnya sendiri | ✅ LULUS | ditolak: Anda tidak boleh mengubah peran atau menonaktifkan akun Anda sendiri |
| TC-03 | BR-02 check-in pertama berhasil, jam dari server (Andi) | ✅ LULUS |  / cek OK |
| TC-04 | BR-02 check-in kedua di hari yang sama ditolak | ✅ LULUS | ditolak: Anda sudah check-in hari ini |
| TC-05 | BR-02 check-in ditolak saat cuti yang disetujui (Yoga cuti 19-20 Okt) | ✅ LULUS | ditolak: Check-in ditolak: hari ini Anda sedang cuti, sakit, atau izin yang sudah disetujui |
| TC-06 | BR-02 check-out berhasil setelah check-in | ✅ LULUS |  |
| TC-07 | BR-02 check-out kedua ditolak | ✅ LULUS | ditolak: Anda sudah check-out hari ini |
| TC-08 | BR-03 08.15.00 = hadir, 08.15.01 = terlambat (fungsi status_absen + data 12 Okt) | ✅ LULUS |  |
| TC-09 | BR-03 karyawan tidak bisa mengubah/menulis absensi langsung | ✅ LULUS | ditolak: permission denied for table absensi |
| TC-10 | BR-03 koreksi absensi oleh non-HRD ditolak | ✅ LULUS | ditolak: Hanya HRD yang dapat mengoreksi absensi |
| TC-11 | BR-03 koreksi HRD dengan alasan <10 karakter ditolak | ✅ LULUS | ditolak: Alasan koreksi minimal 10 karakter |
| TC-12 | BR-03 koreksi HRD valid berhasil dan tercatat di audit log | ✅ LULUS |  / cek OK |
| TC-13 | BR-05 hitung hari kerja 22-23 Okt = 1 (23 Okt libur perusahaan) | ✅ LULUS |  |
| TC-14 | BR-05 rentang Sabtu-Minggu saja ditolak | ✅ LULUS | ditolak: Rentang tanggal tidak berisi hari kerja (Sabtu, Minggu, dan hari libur tidak dihitung) |
| TC-15 | BR-05 cuti tahunan kurang dari H-3 ditolak | ✅ LULUS | ditolak: Cuti tahunan harus diajukan paling lambat 3 hari kalender sebelum tanggal mulai (H-3) |
| TC-16 | BR-04 cuti tahunan sebelum masa kerja 12 bulan ditolak (Rizky) | ✅ LULUS | ditolak: Cuti tahunan baru boleh dimulai setelah masa kerja genap 12 bulan (mulai 02-11-2026) |
| TC-17 | BR-08 sakit >1 hari tanpa surat dokter ditolak | ✅ LULUS | ditolak: Sakit lebih dari 1 hari kerja wajib melampirkan surat dokter |
| TC-18 | BR-08 izin lebih dari 2 hari kerja ditolak | ✅ LULUS | ditolak: Izin paling banyak 2 hari kerja per pengajuan |
| TC-19 | BR-07 pengajuan beririsan dengan pengajuan berjalan ditolak (Fajar 21 Okt) | ✅ LULUS | ditolak: Tanggal bertabrakan dengan pengajuan lain yang masih berjalan |
| TC-20 | BR-06 Siti (sisa 1) mengajukan 2 hari ditolak | ✅ LULUS | ditolak: Sisa kuota cuti tidak cukup: sisa 1 hari, diajukan 2 hari |
| TC-21 | BR-06 dua pengajuan bersamaan, sisa kuota 1: hanya satu berhasil | ✅ LULUS | berhasil=1, ditolak karena kuota=1 |
| TC-22 | BR-06 kuota Siti terpakai 12 (tidak minus, tepat 1 pengajuan berhasil) | ✅ LULUS |  / cek OK |
| TC-23 | BR-09 Atasan divisi lain (Bayu) tidak bisa memutuskan tahap 1 pengajuan Andi | ✅ LULUS | ditolak: Hanya Atasan divisi pemohon yang dapat memutuskan tahap pertama |
| TC-24 | BR-09 HRD tidak boleh melompati tahap Atasan | ✅ LULUS | ditolak: HRD tidak boleh melompati tahap Atasan |
| TC-25 | BR-09 Atasan divisi pemohon (Maya) menyetujui tahap 1 | ✅ LULUS |  / cek OK |
| TC-26 | BR-09 tidak ada yang bisa memutuskan pengajuan sendiri (Dimas, HRD) | ✅ LULUS | ditolak: Anda tidak dapat memutuskan pengajuan Anda sendiri |
| TC-27 | BR-09 pengajuan Dimas diputuskan HRD lain (Rina) | ✅ LULUS |  / cek OK |
| TC-28 | BR-09 pengajuan Atasan (Bayu) langsung ke HRD, tahap Atasan dilewati | ✅ LULUS |  / cek OK |
| TC-29 | BR-09 penolakan tanpa alasan >=10 karakter ditolak | ✅ LULUS | ditolak: Alasan penolakan minimal 10 karakter |
| TC-30 | BR-06 HRD menolak (Putri): kuota kembali, sisa 0 -> 3 | ✅ LULUS |  / cek OK |
| TC-31 | BR-10 pemohon (Andi) membatalkan: kuota kembali (terpakai 7 -> 4) | ✅ LULUS |  / cek OK |
| TC-32 | BR-10 pengajuan yang sudah dibatalkan tidak bisa diaktifkan/dibatalkan lagi | ✅ LULUS | ditolak: Pengajuan berstatus dibatalkan tidak dapat dibatalkan |
| TC-33 | BR-10 pengajuan disetujui hanya bisa dibatalkan HRD (Yoga oleh Yoga ditolak) | ✅ LULUS | ditolak: Pengajuan yang sudah disetujui hanya dapat dibatalkan oleh HRD |
| TC-34 | BR-10 HRD tidak bisa membatalkan setelah tanggal mulai (Yoga 19 Okt) | ✅ LULUS | ditolak: Pengajuan hanya dapat dibatalkan sebelum tanggal mulai |
| TC-35 | BR-10 HRD membatalkan cuti disetujui sebelum tanggal mulai (Bayu umrah) | ✅ LULUS |  / cek OK |
| TC-37 | BR-11 Atasan membaca slip anggota lewat query langsung -> 0 baris | ✅ LULUS |  |
| TC-38 | BR-11 Karyawan (Andi) hanya melihat slip sendiri yang terbit (tidak draf Okt) | ✅ LULUS |  |
| TC-39 | BR-11 Atasan tidak bisa membuat slip (RLS) | ✅ LULUS | ditolak: new row violates row-level security policy for table "slip_gaji" |
| TC-40 | BR-12 HRD menerbitkan slip Okt: nomor berurutan SG-202610-001 dst | ✅ LULUS |  / cek OK |
| TC-41 | BR-12 nomor slip berikutnya berurutan, tidak kembar | ✅ LULUS |  / cek OK |
| TC-42 | BR-12 slip terbit tidak bisa diubah | ✅ LULUS | ditolak: Slip yang sudah terbit tidak dapat diubah |
| TC-43 | BR-12 slip terbit tidak bisa dihapus | ✅ LULUS | ditolak: Slip yang sudah terbit tidak dapat dihapus |
| TC-44 | BR-12 satu slip per karyawan per periode | ✅ LULUS | ditolak: duplicate key value violates unique constraint "slip_gaji_karyawan_id_periode_key" |
| TC-45 | BR-12 total diterima dihitung otomatis dan tidak boleh negatif | ✅ LULUS | ditolak: Total diterima tidak boleh di bawah nol |
| TC-46 | BR-12 audit log tidak bisa diubah/dihapus oleh HRD | ✅ LULUS | ditolak: permission denied for table audit_log |
| TC-47 | BR-12 audit log tidak bisa dihapus walau oleh proses sistem (trigger) | ✅ LULUS | Audit log tidak dapat diubah atau dihapus |

## Catatan
- **TC-21 (dua pengajuan bersamaan)** dijalankan dengan dua sesi database paralel: sesi A menahan transaksi 2 detik sambil memegang kunci baris kuota, sesi B mengirim 0,7 detik kemudian. Hasil: tepat satu berhasil, satu ditolak karena sisa kuota. Pengamanan berlapis: `SELECT ... FOR UPDATE` pada baris kuota, `CHECK (terpakai_hari <= jatah_hari)`, dan *exclusion constraint* untuk tanggal yang beririsan.
- **TC-03/04/05/06/07 (check-in/out)** memakai jam server sungguhan; jendela 06.00–12.00 WIB membuatnya hanya lulus bila dijalankan pada jam itu di hari kerja. Batas 08.15.00 vs 08.15.01 diuji deterministik lewat fungsi `status_absen()` (TC-08).
- Data uji berubah saat uji berjalan; muat ulang data contoh sebelum mengulang.
