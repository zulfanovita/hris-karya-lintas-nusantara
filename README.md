# HRIS PT Karsa Lintas Nusantara

Aplikasi HRIS internal (Next.js 15 App Router + Supabase) — absensi dengan jam server, cuti/sakit/izin berjenjang, slip gaji rahasia, laporan, dan audit log. Dibangun mengikuti `PRD_HRIS.docx`, `ERD_HRIS.pdf`, dan `Data_Contoh_HRIS.xlsx`.

## Pemenuhan syarat wajib

| Syarat | Bagaimana dipenuhi |
|---|---|
| **3 peran, hak akses berbeda** | `karyawan`, `atasan`, `hrd`. Menu per peran di UI **dan** RLS di database (`001_skema.sql`, bagian RLS). Atasan hanya melihat divisinya; tidak ada policy slip untuk Atasan. |
| **Aturan bisnis dijaga sampai database** | Semua BR-01…BR-12 ada di fungsi/trigger/constraint SQL (`check_in`, `ajukan_cuti`, `putuskan_pengajuan`, …). Tombol tersembunyi tidak berpengaruh: tabel `absensi`, `pengajuan_cuti`, `audit_log` **tidak punya hak tulis** untuk pengguna, hanya lewat fungsi. |
| **Alur status** | `diajukan → disetujui_atasan → disetujui / ditolak / dibatalkan` hanya lewat `putuskan_pengajuan` & `batalkan_pengajuan`; perpindahan lain ditolak. Slip `draf → terbit` (terkunci oleh trigger). |
| **Data rahasia** | Slip: RLS hanya HRD, atau pemilik bila `terbit`. Rekap gaji: fungsi khusus HRD. Lampiran surat dokter: bucket privat + tautan sementara 60 detik; policy Storage hanya pemohon/Atasan divisi/HRD. Email slip tanpa nominal. |
| **Aman bentrok** | Kuota: `SELECT … FOR UPDATE` + `CHECK`. Nomor slip: *advisory lock* per periode + `UNIQUE`. Absensi: `UNIQUE(karyawan_id, tanggal)`. Pengajuan beririsan: *exclusion constraint*. |
| **Dashboard grafik data nyata** | Dashboard HRD + halaman Laporan (Recharts) dari fungsi SQL atas data tabel, difilter divisi & rentang tanggal. |
| **Audit log** | Trigger mencatat perubahan profil/peran, kuota, setiap perubahan status pengajuan, koreksi absensi, slip (buat/ubah/terbit), divisi, hari libur. Tidak bisa diubah/dihapus (hak dicabut + trigger). Lihat Pengaturan → Audit log (filter aksi & tanggal). |
| **Tayang di Netlify** | `netlify.toml` siap pakai (lihat bawah). Semua halaman `noindex` (meta, header `X-Robots-Tag`, `robots.txt`). |

### Peningkatan fitur (di luar PRD wajib)
1. **Notifikasi email** (Resend): pengajuan baru → Atasan/HRD; menunggu keputusan akhir → HRD; disetujui/ditolak/dibatalkan → pemohon; slip terbit → karyawan (tautan saja, tanpa nominal). Gagal kirim tidak membatalkan aksi utama. Aktif bila `RESEND_API_KEY` diisi.
2. **Ekspor CSV** untuk kehadiran, cuti per divisi, keterlambatan, dan rekap gaji (hanya HRD; dicek di database).
3. **Pencarian & filter**: karyawan (nama/NIK/email/jabatan/divisi/status), absensi (tanggal/divisi/nama), persetujuan (nama/status/jenis), audit log.
4. **Pratinjau langsung** di formulir cuti: hitung hari kerja & sisa kuota sebelum kirim; **salin slip dari periode sebelumnya** & **terbitkan semua draf**; **cetak slip** ke PDF.

## Menjalankan

### 1. Supabase
1. Buat project di supabase.com.
2. SQL Editor → jalankan **`supabase/migrations/001_skema.sql`**, **`002_storage.sql`**, lalu **`003_atasan_baca_karyawan_nonaktif.sql`**. Untuk project yang sudah menjalankan migrasi 001 dan 002, jalankan migrasi 003 saja agar Atasan dapat melihat akun nonaktif di divisinya.
3. Authentication → Providers → Email: nonaktifkan *Allow new users to sign up* (PRD: tanpa pendaftaran mandiri).
4. Salin URL, anon key, dan service_role key (Project Settings → API).

### 2. Lokal
```bash
cp .env.example .env.local      # isi nilai Supabase
npm install --legacy-peer-deps
npm run seed                    # membuat 16 akun uji + mengimpor data contoh
npm run dev                     # http://localhost:3000
```
Akun uji (kata sandi semua **`Latihan#2026`**): `rina.kusumawardani@…` (HRD), `dimas.pratama@…` (HRD), `maya.anggraini@…` / `bayu.setiawan@…` (Atasan), `andi.wijaya@…` / `siti.nurhaliza@…` (Karyawan), dst — domain `@karsalintas.test`. `bambang.hartono@…` nonaktif (login ditolak).

> Data contoh mengasumsikan "hari ini" = 15 Okt 2026. Pada laporan, pilih rentang 21 Sep–15 Okt 2026 untuk melihat data lengkap; hari tanpa absensi setelah 15 Okt dihitung "tanpa keterangan" sesuai aturan.

### 3. Netlify
1. Push ke GitHub → Netlify → *Add new site → Import*. Build: `npm run build` (otomatis lewat `netlify.toml`; plugin Next.js terdeteksi).
2. Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`, opsional `RESEND_API_KEY`, `EMAIL_FROM`.
3. Deploy, lalu buka URL tayang dan masuk dengan akun uji.
4. Cadangan harian (PRD §10): Supabase Pro memberi backup harian + PITR; pada paket Free, jadwalkan `pg_dump` mandiri.

## Uji
`docs/HASIL_UJI.md` — 46 uji aturan bisnis langsung ke database (semua lulus). Skrip: `supabase/tests/`.

## Struktur
```
supabase/migrations   001_skema.sql (tabel, RLS, trigger, fungsi) · 002_storage.sql (bucket lampiran)
supabase/tests        uji SQL + jalankan_uji.sh
scripts/seed.mjs      akun Auth + impor data contoh (memetakan id lama → id auth.users)
src/app               halaman (masuk, dashboard, absensi, cuti, persetujuan, karyawan, slip, laporan, pengaturan) + actions.ts + api/
src/lib               klien Supabase, sesi, format, email, notifikasi
```

## Keamanan — catatan
- `SUPABASE_SERVICE_ROLE_KEY` hanya dipakai di server (membuat akun, memblokir akun nonaktif, mencari email penerima, seed). Jangan diberi awalan `NEXT_PUBLIC_`.
- Semua aksi pengguna memakai sesi pengguna (anon key + RLS), bukan service role.
- Menonaktifkan karyawan juga memblokir akunnya di Supabase Auth.

## Tampilan & tema
Antarmuka bergaya dasbor modern: sidebar berikon, topbar dengan pencarian karyawan, kartu membulat, dan kolom kanan (kalender + daftar tim / antrean / hari libur). Tersedia **mode terang dan gelap**: tombol di topbar (dan di halaman Masuk); pilihan tersimpan di peramban, dan bila belum memilih mengikuti pengaturan perangkat. Seluruh warna ada di variabel CSS `src/app/globals.css` (`:root` untuk terang, `html[data-theme=dark]` untuk gelap), sehingga mengganti warna merek cukup mengubah `--brand` dan `--btn`.
