create or replace function public.check_out() returns uuid language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_tgl date := public.tanggal_wib(); r public.absensi;
begin
  if not public.profil_aktif() then raise exception 'Akun tidak aktif'; end if;
  if extract(isodow from v_tgl) >= 6 then raise exception 'Check-out hanya pada hari kerja (Senin sampai Jumat)'; end if;
  if exists (select 1 from public.hari_libur where tanggal = v_tgl) then raise exception 'Hari ini hari libur, check-out tidak diperlukan'; end if;
  select * into r from public.absensi where karyawan_id = v_uid and tanggal = v_tgl for update;
  if not found then raise exception 'Anda belum check-in hari ini'; end if;
  if r.jam_pulang is not null then raise exception 'Anda sudah check-out hari ini'; end if;
  update public.absensi set jam_pulang = clock_timestamp() where id = r.id;
  return r.id;
end $$;
