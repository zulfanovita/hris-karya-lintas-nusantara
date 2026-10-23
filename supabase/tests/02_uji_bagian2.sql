\set ON_ERROR_STOP 0
select t.coba('TC-22','BR-06 kuota Siti terpakai 12 (tidak minus, tepat 1 pengajuan berhasil)','siti.nurhaliza@karsalintas.test',
 $q$select 1$q$, null,
 $q$select (select terpakai_hari from kuota_cuti k join profiles p on p.id=k.karyawan_id where p.nama_lengkap='Siti Nurhaliza' and tahun=2026)=12
      and (select count(*) from pengajuan_cuti c join profiles p on p.id=c.karyawan_id where p.nama_lengkap='Siti Nurhaliza' and c.tanggal_mulai>='2026-11-18')=1$q$);
-- BR-09
select t.coba('TC-23','BR-09 Atasan divisi lain (Bayu) tidak bisa memutuskan tahap 1 pengajuan Andi','bayu.setiawan@karsalintas.test',
 $q$select public.putuskan_pengajuan(t.pid('Pulang kampung ke Yogyakarta'), true)$q$, 'Atasan divisi pemohon');
select t.coba('TC-24','BR-09 HRD tidak boleh melompati tahap Atasan','rina.kusumawardani@karsalintas.test',
 $q$select public.putuskan_pengajuan(t.pid('Pulang kampung ke Yogyakarta'), true)$q$, 'melompati');
select t.coba('TC-25','BR-09 Atasan divisi pemohon (Maya) menyetujui tahap 1','maya.anggraini@karsalintas.test',
 $q$select public.putuskan_pengajuan(t.pid('Pulang kampung ke Yogyakarta'), true)$q$, null,
 $q$select exists(select 1 from pengajuan_cuti where alasan='Pulang kampung ke Yogyakarta' and status='disetujui_atasan')$q$);
select t.coba('TC-26','BR-09 tidak ada yang bisa memutuskan pengajuan sendiri (Dimas, HRD)','dimas.pratama@karsalintas.test',
 $q$select public.putuskan_pengajuan(t.pid('Libur panjang bersama keluarga'), true)$q$, 'sendiri');
select t.coba('TC-27','BR-09 pengajuan Dimas diputuskan HRD lain (Rina)','rina.kusumawardani@karsalintas.test',
 $q$select public.putuskan_pengajuan(t.pid('Libur panjang bersama keluarga'), true)$q$, null,
 $q$select exists(select 1 from pengajuan_cuti where alasan='Libur panjang bersama keluarga' and status='disetujui')$q$);
select t.coba('TC-28','BR-09 pengajuan Atasan (Bayu) langsung ke HRD, tahap Atasan dilewati','rina.kusumawardani@karsalintas.test',
 $q$select public.putuskan_pengajuan(t.pid('Umrah bersama orang tua'), true)$q$, null,
 $q$select exists(select 1 from pengajuan_cuti where alasan='Umrah bersama orang tua' and status='disetujui' and not perlu_atasan)$q$);
-- BR-06 / BR-10
select t.coba('TC-29','BR-09 penolakan tanpa alasan >=10 karakter ditolak','rina.kusumawardani@karsalintas.test',
 $q$select public.putuskan_pengajuan(t.pid('Pernikahan kakak di Medan'), false, 'tidak')$q$, 'minimal 10');
select t.coba('TC-30','BR-06 HRD menolak (Putri): kuota kembali, sisa 0 -> 3','rina.kusumawardani@karsalintas.test',
 $q$select public.putuskan_pengajuan(t.pid('Pernikahan kakak di Medan'), false, 'Bertepatan dengan periode stok opname')$q$, null,
 $q$select (select jatah_hari-terpakai_hari from kuota_cuti k join profiles p on p.id=k.karyawan_id where p.nama_lengkap='Putri Lestari' and tahun=2026)=3$q$);
select t.coba('TC-31','BR-10 pemohon (Andi) membatalkan: kuota kembali (terpakai 7 -> 4)','andi.wijaya@karsalintas.test',
 $q$select public.batalkan_pengajuan(t.pid('Pulang kampung ke Yogyakarta'))$q$, null,
 $q$select (select terpakai_hari from kuota_cuti k join profiles p on p.id=k.karyawan_id where p.nama_lengkap='Andi Wijaya' and tahun=2026)=4$q$);
select t.coba('TC-32','BR-10 pengajuan yang sudah dibatalkan tidak bisa diaktifkan/dibatalkan lagi','andi.wijaya@karsalintas.test',
 $q$select public.batalkan_pengajuan(t.pid('Pulang kampung ke Yogyakarta'))$q$, 'tidak dapat dibatalkan');
select t.coba('TC-33','BR-10 pengajuan disetujui hanya bisa dibatalkan HRD (Yoga oleh Yoga ditolak)','yoga.permana@karsalintas.test',
 $q$select public.batalkan_pengajuan(t.pid('Acara keluarga di Bandung'))$q$, 'hanya dapat dibatalkan oleh HRD');
select t.coba('TC-34','BR-10 HRD tidak bisa membatalkan setelah tanggal mulai (Yoga 19 Okt)','rina.kusumawardani@karsalintas.test',
 $q$select public.batalkan_pengajuan(t.pid('Acara keluarga di Bandung'))$q$, 'sebelum tanggal mulai');
select t.coba('TC-35','BR-10 HRD membatalkan cuti disetujui sebelum tanggal mulai (Bayu umrah)','rina.kusumawardani@karsalintas.test',
 $q$select public.batalkan_pengajuan(t.pid('Umrah bersama orang tua'))$q$, null,
 $q$select (select terpakai_hari from kuota_cuti k join profiles p on p.id=k.karyawan_id where p.nama_lengkap='Bayu Setiawan' and tahun=2026)=4 and exists(select 1 from pengajuan_cuti where alasan='Umrah bersama orang tua' and status='dibatalkan')$q$);
-- BR-11 / BR-12
select t.coba('TC-37','BR-11 Atasan membaca slip anggota lewat query langsung -> 0 baris','maya.anggraini@karsalintas.test',
 $q$do $d$ begin if (select count(*) from public.slip_gaji where karyawan_id <> auth.uid()) <> 0 then raise exception 'BOCOR: atasan melihat slip orang lain'; end if; end $d$$q$, null);
select t.coba('TC-38','BR-11 Karyawan (Andi) hanya melihat slip sendiri yang terbit (tidak draf Okt)','andi.wijaya@karsalintas.test',
 $q$do $d$ begin if (select count(*) from public.slip_gaji) <> 2 or exists(select 1 from public.slip_gaji where status='draf' or karyawan_id<>auth.uid()) then raise exception 'BOCOR slip'; end if; end $d$$q$, null);
select t.coba('TC-39','BR-11 Atasan tidak bisa membuat slip (RLS)','maya.anggraini@karsalintas.test',
 $q$insert into public.slip_gaji(karyawan_id,periode,gaji_pokok) values (auth.uid(),'2026-11-01',1000)$q$, 'row-level security');
select t.coba('TC-40','BR-12 HRD menerbitkan slip Okt: nomor berurutan SG-202610-001 dst','rina.kusumawardani@karsalintas.test',
 $q$update public.slip_gaji set status='terbit' where periode='2026-10-01' and karyawan_id in (select id from public.profiles where nama_lengkap='Wulan Sari')$q$, null,
 $q$select exists(select 1 from slip_gaji s join profiles p on p.id=s.karyawan_id where p.nama_lengkap='Wulan Sari' and s.periode='2026-10-01' and s.nomor_slip='SG-202610-001' and s.diterbitkan_oleh is not null)$q$);
select t.coba('TC-41','BR-12 nomor slip berikutnya berurutan, tidak kembar','dimas.pratama@karsalintas.test',
 $q$update public.slip_gaji set status='terbit' where periode='2026-10-01' and karyawan_id in (select id from public.profiles where nama_lengkap='Yoga Permana')$q$, null,
 $q$select exists(select 1 from slip_gaji s join profiles p on p.id=s.karyawan_id where p.nama_lengkap='Yoga Permana' and s.periode='2026-10-01' and s.nomor_slip='SG-202610-002')$q$);
select t.coba('TC-42','BR-12 slip terbit tidak bisa diubah','rina.kusumawardani@karsalintas.test',
 $q$update public.slip_gaji set gaji_pokok=1 where nomor_slip='SG-202608-001'$q$, 'sudah terbit');
select t.coba('TC-43','BR-12 slip terbit tidak bisa dihapus','rina.kusumawardani@karsalintas.test',
 $q$delete from public.slip_gaji where nomor_slip='SG-202608-001'$q$, 'sudah terbit');
select t.coba('TC-44','BR-12 satu slip per karyawan per periode','rina.kusumawardani@karsalintas.test',
 $q$insert into public.slip_gaji(karyawan_id,periode,gaji_pokok) select id,'2026-08-01',1000 from public.profiles where nama_lengkap='Andi Wijaya'$q$, 'duplicate');
select t.coba('TC-45','BR-12 total diterima dihitung otomatis dan tidak boleh negatif','rina.kusumawardani@karsalintas.test',
 $q$insert into public.slip_gaji(karyawan_id,periode,gaji_pokok,potongan) select id,'2026-11-01',1000,5000 from public.profiles where nama_lengkap='Andi Wijaya'$q$, 'di bawah nol');
-- Audit & hak akses
select t.coba('TC-46','BR-12 audit log tidak bisa diubah/dihapus oleh HRD','rina.kusumawardani@karsalintas.test',
 $q$delete from public.audit_log$q$, 'permission denied');
do $d$ begin
  begin delete from public.audit_log; insert into t.hasil(kode,uji,hasil) values ('TC-47','BR-12 audit log tidak bisa dihapus walau oleh proses sistem (trigger)','GAGAL');
  exception when others then insert into t.hasil(kode,uji,hasil,detail) values ('TC-47','BR-12 audit log tidak bisa dihapus walau oleh proses sistem (trigger)','LULUS',sqlerrm); end;
end $d$;
