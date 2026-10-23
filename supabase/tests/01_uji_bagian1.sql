\set ON_ERROR_STOP 0
select t.coba('TC-01','BR-01 akun nonaktif tidak bisa melakukan aksi (Bambang)','bambang.hartono@karsalintas.test',
 $q$select public.ajukan_cuti('izin', public.tanggal_wib()+5, public.tanggal_wib()+5, 'Keperluan keluarga')$q$, 'tidak aktif');
select t.coba('TC-02','BR-01 HRD tidak boleh menonaktifkan akunnya sendiri','rina.kusumawardani@karsalintas.test',
 $q$update public.profiles set aktif=false where id=auth.uid()$q$, 'sendiri');
select t.coba('TC-03','BR-02 check-in pertama berhasil, jam dari server (Andi)','andi.wijaya@karsalintas.test',
 $q$select public.check_in()$q$, null,
 $q$select exists(select 1 from absensi a join profiles p on p.id=a.karyawan_id where p.email='andi.wijaya@karsalintas.test' and a.tanggal=public.tanggal_wib())$q$);
select t.coba('TC-04','BR-02 check-in kedua di hari yang sama ditolak','andi.wijaya@karsalintas.test',
 $q$select public.check_in()$q$, 'sudah check-in');
select t.coba('TC-05','BR-02 check-in ditolak saat cuti yang disetujui (Yoga cuti 19-20 Okt)','yoga.permana@karsalintas.test',
 $q$select public.check_in()$q$, 'sedang cuti');
select t.coba('TC-06','BR-02 check-out berhasil setelah check-in','andi.wijaya@karsalintas.test',
 $q$select public.check_out()$q$, null);
select t.coba('TC-07','BR-02 check-out kedua ditolak','andi.wijaya@karsalintas.test',
 $q$select public.check_out()$q$, 'sudah check-out');
insert into t.hasil(kode,uji,hasil,detail)
select 'TC-08','BR-03 08.15.00 = hadir, 08.15.01 = terlambat (fungsi status_absen + data 12 Okt)',
 case when public.status_absen('2026-10-12 08:15:00+07')='hadir' and public.status_absen('2026-10-12 08:15:01+07')='terlambat'
       and (select status from absensi a join profiles p on p.id=a.karyawan_id where p.nama_lengkap='Andi Wijaya' and a.tanggal='2026-10-12')='hadir'
       and (select status from absensi a join profiles p on p.id=a.karyawan_id where p.nama_lengkap='Siti Nurhaliza' and a.tanggal='2026-10-12')='terlambat'
      then 'LULUS' else 'GAGAL' end, null;
select t.coba('TC-09','BR-03 karyawan tidak bisa mengubah/menulis absensi langsung','andi.wijaya@karsalintas.test',
 $q$update public.absensi set status='hadir' where karyawan_id=auth.uid()$q$, 'permission denied');
select t.coba('TC-10','BR-03 koreksi absensi oleh non-HRD ditolak','andi.wijaya@karsalintas.test',
 $q$select public.koreksi_absensi(auth.uid(), public.tanggal_wib()-1, ((public.tanggal_wib()-1)::text || ' 08:00:00+07')::timestamptz, null, 'Lupa check-in kemarin')$q$, 'Hanya HRD');
select t.coba('TC-11','BR-03 koreksi HRD dengan alasan <10 karakter ditolak','rina.kusumawardani@karsalintas.test',
 $q$select public.koreksi_absensi(t.id('andi.wijaya@karsalintas.test'), public.tanggal_wib()-1, ((public.tanggal_wib()-1)::text || ' 08:00:00+07')::timestamptz, null, 'lupa')$q$, 'minimal 10');
select t.coba('TC-12','BR-03 koreksi HRD valid berhasil dan tercatat di audit log','rina.kusumawardani@karsalintas.test',
 $q$select public.koreksi_absensi(t.id('andi.wijaya@karsalintas.test'), public.tanggal_wib()-1, ((public.tanggal_wib()-1)::text || ' 08:00:00+07')::timestamptz, null, 'Lupa check-in kemarin, bukti CCTV')$q$, null,
 $q$select exists(select 1 from audit_log where aksi like 'koreksi_absensi%')$q$);
select t.coba('TC-13','BR-05 hitung hari kerja 22-23 Okt = 1 (23 Okt libur perusahaan)','andi.wijaya@karsalintas.test',
 $q$do $d$ begin if public.hitung_hari_kerja('2026-10-22','2026-10-23') <> 1 or public.hitung_hari_kerja('2026-10-19','2026-10-25') <> 4 then raise exception 'hitungan salah'; end if; end $d$$q$, null);
select t.coba('TC-14','BR-05 rentang Sabtu-Minggu saja ditolak','andi.wijaya@karsalintas.test',
 $q$select public.ajukan_cuti('izin','2026-10-24','2026-10-25','Keperluan keluarga')$q$, 'tidak berisi hari kerja');
select t.coba('TC-15','BR-05 cuti tahunan kurang dari H-3 ditolak','agus.salim@karsalintas.test',
 $q$select public.ajukan_cuti('cuti_tahunan', public.tanggal_wib()+2, public.tanggal_wib()+2, 'Keperluan keluarga')$q$, 'H-3');
select t.coba('TC-16','BR-04 cuti tahunan sebelum masa kerja 12 bulan ditolak (Rizky)','rizky.ramadhan@karsalintas.test',
 $q$select public.ajukan_cuti('cuti_tahunan','2026-10-28','2026-10-28','Keperluan keluarga')$q$, '12 bulan');
select t.coba('TC-17','BR-08 sakit >1 hari tanpa surat dokter ditolak','wulan.sari@karsalintas.test',
 $q$select public.ajukan_cuti('sakit', public.tanggal_wib()-1, public.tanggal_wib(), 'Demam tinggi')$q$, 'surat dokter');
select t.coba('TC-18','BR-08 izin lebih dari 2 hari kerja ditolak','wulan.sari@karsalintas.test',
 $q$select public.ajukan_cuti('izin','2026-10-26','2026-10-28','Keperluan keluarga')$q$, 'paling banyak 2');
select t.coba('TC-19','BR-07 pengajuan beririsan dengan pengajuan berjalan ditolak (Fajar 21 Okt)','fajar.nugroho@karsalintas.test',
 $q$select public.ajukan_cuti('izin','2026-10-21','2026-10-21','Mengurus dokumen')$q$, 'bertabrakan');
select t.coba('TC-20','BR-06 Siti (sisa 1) mengajukan 2 hari ditolak','siti.nurhaliza@karsalintas.test',
 $q$select public.ajukan_cuti('cuti_tahunan','2026-11-16','2026-11-17','Keperluan keluarga')$q$, 'Sisa kuota');
