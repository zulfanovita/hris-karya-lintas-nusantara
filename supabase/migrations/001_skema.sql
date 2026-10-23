-- =====================================================================
-- HRIS PT Karsa Lintas Nusantara - Skema, RLS, trigger, dan fungsi bisnis
-- Jalankan di Supabase SQL Editor (atau `supabase db push`).
-- =====================================================================
create extension if not exists btree_gist;

-- ---------------------------------------------------------------- TABEL
create table public.divisi (
  id uuid primary key default gen_random_uuid(),
  nama text not null unique check (char_length(trim(nama)) > 0),
  manajer_id uuid unique,
  dibuat_pada timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nik_karyawan text not null unique check (nik_karyawan ~ '^KLN-[0-9]{4}$'),
  nama_lengkap text not null check (char_length(trim(nama_lengkap)) >= 3),
  email text not null unique,
  nomor_hp text,
  peran text not null default 'karyawan' check (peran in ('karyawan','atasan','hrd')),
  divisi_id uuid references public.divisi(id),
  jabatan text not null check (char_length(trim(jabatan)) > 0),
  status_kerja text not null check (status_kerja in ('tetap','kontrak')),
  tanggal_masuk date not null,
  aktif boolean not null default true,
  dibuat_pada timestamptz not null default now()
);
alter table public.divisi add constraint divisi_manajer_fk foreign key (manajer_id) references public.profiles(id);

create table public.hari_libur (
  tanggal date primary key,
  keterangan text not null check (char_length(trim(keterangan)) > 0),
  jenis text not null check (jenis in ('nasional','cuti_bersama','perusahaan'))
);

create table public.kuota_cuti (
  id uuid primary key default gen_random_uuid(),
  karyawan_id uuid not null references public.profiles(id),
  tahun int not null check (tahun between 2000 and 2100),
  jatah_hari int not null default 12 check (jatah_hari between 0 and 12),
  terpakai_hari int not null default 0 check (terpakai_hari >= 0),
  unique (karyawan_id, tahun),
  constraint kuota_tidak_melebihi_jatah check (terpakai_hari <= jatah_hari)
);

create table public.pengajuan_cuti (
  id uuid primary key default gen_random_uuid(),
  karyawan_id uuid not null references public.profiles(id),
  jenis text not null check (jenis in ('cuti_tahunan','sakit','izin')),
  tanggal_mulai date not null,
  tanggal_selesai date not null,
  jumlah_hari int not null check (jumlah_hari >= 1),
  alasan text not null check (char_length(trim(alasan)) >= 5),
  lampiran_path text,
  status text not null default 'diajukan'
    check (status in ('diajukan','disetujui_atasan','disetujui','ditolak','dibatalkan')),
  perlu_atasan boolean not null default true,
  disetujui_atasan_oleh uuid references public.profiles(id),
  disetujui_atasan_pada timestamptz,
  diputuskan_hrd_oleh uuid references public.profiles(id),
  diputuskan_hrd_pada timestamptz,
  alasan_penolakan text,
  dibatalkan_oleh uuid references public.profiles(id),
  dibatalkan_pada timestamptz,
  dibuat_pada timestamptz not null default now(),
  check (tanggal_selesai >= tanggal_mulai),
  check (extract(year from tanggal_mulai) = extract(year from tanggal_selesai)),
  check (status <> 'ditolak' or char_length(trim(coalesce(alasan_penolakan,''))) >= 10),
  -- BR-07: pengajuan yang masih berjalan tidak boleh beririsan (dijaga sampai database)
  constraint pengajuan_tidak_beririsan exclude using gist (
    karyawan_id with =,
    daterange(tanggal_mulai, tanggal_selesai, '[]') with &&
  ) where (status in ('diajukan','disetujui_atasan','disetujui'))
);
create index on public.pengajuan_cuti (karyawan_id, status);

create table public.absensi (
  id uuid primary key default gen_random_uuid(),
  karyawan_id uuid not null references public.profiles(id),
  tanggal date not null,
  jam_masuk timestamptz not null,
  jam_pulang timestamptz,
  status text not null check (status in ('hadir','terlambat')),
  dikoreksi_oleh uuid references public.profiles(id),
  alasan_koreksi text,
  unique (karyawan_id, tanggal),
  check (jam_pulang is null or jam_pulang > jam_masuk),
  check (dikoreksi_oleh is null or char_length(trim(coalesce(alasan_koreksi,''))) >= 10)
);
create index on public.absensi (tanggal);

create table public.slip_gaji (
  id uuid primary key default gen_random_uuid(),
  nomor_slip text unique,
  karyawan_id uuid not null references public.profiles(id),
  periode date not null check (extract(day from periode) = 1),
  gaji_pokok numeric(12,0) not null check (gaji_pokok >= 0),
  tunjangan numeric(12,0) not null default 0 check (tunjangan >= 0),
  potongan numeric(12,0) not null default 0 check (potongan >= 0),
  total_diterima numeric(12,0) not null default 0 check (total_diterima >= 0),
  catatan text,
  status text not null default 'draf' check (status in ('draf','terbit')),
  dibuat_oleh uuid references public.profiles(id),
  diterbitkan_oleh uuid references public.profiles(id),
  diterbitkan_pada timestamptz,
  dibuat_pada timestamptz not null default now(),
  unique (karyawan_id, periode)
);

create table public.audit_log (
  id bigint generated by default as identity primary key,
  pelaku_id uuid references public.profiles(id),
  aksi text not null,
  nama_tabel text not null,
  data_id text,
  nilai_sebelum jsonb,
  nilai_sesudah jsonb,
  dibuat_pada timestamptz not null default now()
);
create index on public.audit_log (dibuat_pada desc);

-- ------------------------------------------------------ FUNGSI BANTU
create function public.tanggal_wib() returns date language sql stable
as $$ select (clock_timestamp() at time zone 'Asia/Jakarta')::date $$;

create function public.profil_aktif() returns boolean language sql stable security definer set search_path = public
as $$ select coalesce((select aktif from public.profiles where id = auth.uid()), false) $$;

create function public.peran_saya() returns text language sql stable security definer set search_path = public
as $$ select peran from public.profiles where id = auth.uid() and aktif $$;

create function public.adalah_hrd() returns boolean language sql stable security definer set search_path = public
as $$ select coalesce((select peran = 'hrd' from public.profiles where id = auth.uid() and aktif), false) $$;

-- true bila pengguna saat ini adalah Atasan (manajer) dari divisi milik p_karyawan
create function public.atasan_dari(p_karyawan uuid) returns boolean language sql stable security definer set search_path = public
as $$
  select public.profil_aktif() and exists (
    select 1 from public.profiles p join public.divisi d on d.id = p.divisi_id
    where p.id = p_karyawan and d.manajer_id = auth.uid())
$$;

create function public.hitung_hari_kerja(p_mulai date, p_selesai date) returns int
language sql stable security definer set search_path = public
as $$
  select count(*)::int
  from generate_series(p_mulai::timestamp, p_selesai::timestamp, interval '1 day') g(d)
  where extract(isodow from g.d) < 6
    and not exists (select 1 from public.hari_libur h where h.tanggal = g.d::date)
$$;

-- BR-03: tepat 08.15.00 masih hadir; mulai 08.15.01 terlambat
create function public.status_absen(p_jam timestamptz) returns text language sql immutable
as $$ select case when date_trunc('second', p_jam at time zone 'Asia/Jakarta')::time > time '08:15:00'
                  then 'terlambat' else 'hadir' end $$;

-- ------------------------------------------------------------ TRIGGER
-- BR-01 profil: HRD tidak boleh mengubah peran / menonaktifkan akunnya sendiri
create function public.trg_profiles_guard() returns trigger language plpgsql as $$
begin
  if auth.uid() is not null and old.id = auth.uid()
     and (new.peran <> old.peran or (old.aktif and not new.aktif)) then
    raise exception 'Anda tidak boleh mengubah peran atau menonaktifkan akun Anda sendiri';
  end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles for each row execute function public.trg_profiles_guard();

-- bila seorang Atasan berganti peran/divisi atau nonaktif, jabatan manajer divisi dilepas
create function public.trg_profiles_lepas_manajer() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.peran <> 'atasan' or not new.aktif or new.divisi_id is distinct from old.divisi_id then
    update public.divisi set manajer_id = null where manajer_id = new.id;
  end if;
  return new;
end $$;
create trigger profiles_lepas_manajer after update on public.profiles for each row execute function public.trg_profiles_lepas_manajer();

-- BR-01: manajer divisi harus akun aktif berperan atasan dan berada di divisi itu
create function public.trg_divisi_guard() returns trigger language plpgsql as $$
begin
  if new.manajer_id is not null and not exists (
      select 1 from public.profiles where id = new.manajer_id and aktif and peran = 'atasan' and divisi_id = new.id) then
    raise exception 'Manajer divisi harus akun aktif berperan Atasan yang berada di divisi tersebut';
  end if;
  return new;
end $$;
create trigger divisi_guard before insert or update on public.divisi for each row execute function public.trg_divisi_guard();

-- BR-06: terpakai_hari hanya berubah lewat proses pengajuan
create function public.trg_kuota_guard() returns trigger language plpgsql as $$
begin
  if auth.uid() is not null and coalesce(current_setting('app.internal', true), '') <> '1' then
    if tg_op = 'INSERT' and new.terpakai_hari <> 0 then
      raise exception 'terpakai_hari hanya berubah lewat proses pengajuan';
    elsif tg_op = 'UPDATE' and new.terpakai_hari <> old.terpakai_hari then
      raise exception 'terpakai_hari hanya berubah lewat proses pengajuan';
    end if;
  end if;
  return new;
end $$;
create trigger kuota_guard before insert or update on public.kuota_cuti for each row execute function public.trg_kuota_guard();

-- BR-12: nomor slip SG-TTTTBB-NNN berurutan per periode, aman dari bentrok
create function public.buat_nomor_slip(p_periode date) returns text language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  perform pg_advisory_xact_lock(hashtext('slip:' || to_char(p_periode, 'YYYYMM')));
  select coalesce(max((substring(nomor_slip from '-([0-9]+)$'))::int), 0) + 1 into v_n
  from public.slip_gaji where periode = p_periode and nomor_slip is not null;
  return 'SG-' || to_char(p_periode, 'YYYYMM') || '-' || lpad(v_n::text, 3, '0');
end $$;

create function public.trg_slip_hitung() returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and old.status = 'terbit' then
    raise exception 'Slip yang sudah terbit tidak dapat diubah';
  end if;
  new.total_diterima := new.gaji_pokok + new.tunjangan - new.potongan;
  if new.total_diterima < 0 then
    raise exception 'Total diterima tidak boleh di bawah nol';
  end if;
  if auth.uid() is not null then
    if tg_op = 'INSERT' then
      new.status := 'draf'; new.nomor_slip := null; new.diterbitkan_oleh := null;
      new.diterbitkan_pada := null; new.dibuat_oleh := auth.uid();
    else
      new.karyawan_id := old.karyawan_id; new.periode := old.periode;
      new.nomor_slip := old.nomor_slip; new.dibuat_oleh := old.dibuat_oleh;
      if new.status = 'terbit' then
        new.nomor_slip := public.buat_nomor_slip(new.periode);
        new.diterbitkan_oleh := auth.uid(); new.diterbitkan_pada := now();
      else
        new.diterbitkan_oleh := null; new.diterbitkan_pada := null;
      end if;
    end if;
  elsif new.status = 'terbit' and new.nomor_slip is null then
    new.nomor_slip := public.buat_nomor_slip(new.periode);
  end if;
  return new;
end $$;
create trigger slip_hitung before insert or update on public.slip_gaji for each row execute function public.trg_slip_hitung();

create function public.trg_slip_hapus() returns trigger language plpgsql as $$
begin
  if old.status = 'terbit' then raise exception 'Slip yang sudah terbit tidak dapat dihapus'; end if;
  return old;
end $$;
create trigger slip_hapus before delete on public.slip_gaji for each row execute function public.trg_slip_hapus();

-- AUDIT LOG: pencatat generik + penjaga agar tak bisa diubah/dihapus
create function public.catat_audit() returns trigger language plpgsql security definer set search_path = public as $$
declare v_old jsonb; v_new jsonb; v_row jsonb;
begin
  if auth.uid() is null then return coalesce(new, old); end if;           -- proses sistem/seed
  if tg_table_name = 'kuota_cuti' and coalesce(current_setting('app.internal', true), '') = '1' then
    return coalesce(new, old);                                             -- perubahan terpakai_hari ikut pengajuan
  end if;
  if tg_op = 'UPDATE' then
    select coalesce(jsonb_object_agg(n.key, n.value), '{}'::jsonb) into v_new
      from jsonb_each(to_jsonb(new)) n(key, value) join jsonb_each(to_jsonb(old)) o(key, value) on o.key = n.key
      where n.value is distinct from o.value;
    select coalesce(jsonb_object_agg(o.key, o.value), '{}'::jsonb) into v_old
      from jsonb_each(to_jsonb(new)) n(key, value) join jsonb_each(to_jsonb(old)) o(key, value) on o.key = n.key
      where n.value is distinct from o.value;
    if v_new = '{}'::jsonb then return new; end if;
    v_row := to_jsonb(new);
  elsif tg_op = 'INSERT' then
    v_new := to_jsonb(new); v_row := v_new;
  else
    v_old := to_jsonb(old); v_row := v_old;
  end if;
  insert into public.audit_log (pelaku_id, aksi, nama_tabel, data_id, nilai_sebelum, nilai_sesudah)
  values (auth.uid(), tg_argv[0] || '_' || lower(tg_op), tg_table_name,
          coalesce(v_row ->> 'id', v_row ->> 'tanggal'), v_old, v_new);
  return coalesce(new, old);
end $$;

create trigger audit_profiles after insert or update on public.profiles for each row execute function public.catat_audit('profil');
create trigger audit_divisi after insert or update or delete on public.divisi for each row execute function public.catat_audit('divisi');
create trigger audit_hari_libur after insert or update or delete on public.hari_libur for each row execute function public.catat_audit('libur');
create trigger audit_kuota after insert or update on public.kuota_cuti for each row execute function public.catat_audit('kuota');
create trigger audit_pengajuan after insert or update on public.pengajuan_cuti for each row execute function public.catat_audit('cuti');
create trigger audit_absensi after insert or update on public.absensi for each row when (new.dikoreksi_oleh is not null) execute function public.catat_audit('koreksi_absensi');
create trigger audit_slip after insert or update or delete on public.slip_gaji for each row execute function public.catat_audit('slip');

create function public.trg_audit_kunci() returns trigger language plpgsql as $$
begin raise exception 'Audit log tidak dapat diubah atau dihapus'; end $$;
create trigger audit_kunci before update or delete on public.audit_log for each row execute function public.trg_audit_kunci();
create trigger audit_kunci_truncate before truncate on public.audit_log for each statement execute function public.trg_audit_kunci();

-- ------------------------------------------------------ FUNGSI BISNIS
-- BR-02/03: check-in. Jam dari server.
create function public.check_in() returns uuid language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_now timestamptz := clock_timestamp();
        v_tgl date; v_jam time; v_id uuid;
begin
  if not public.profil_aktif() then raise exception 'Akun tidak aktif'; end if;
  v_tgl := (v_now at time zone 'Asia/Jakarta')::date;
  v_jam := (v_now at time zone 'Asia/Jakarta')::time;
  if extract(isodow from v_tgl) >= 6 then raise exception 'Check-in hanya pada hari kerja (Senin sampai Jumat)'; end if;
  if exists (select 1 from public.hari_libur where tanggal = v_tgl) then raise exception 'Hari ini hari libur, check-in tidak diperlukan'; end if;
  if v_jam < time '06:00:00' or v_jam > time '12:00:00' then
    raise exception 'Check-in hanya dapat dilakukan pukul 06.00 sampai 12.00 WIB';
  end if;
  if exists (select 1 from public.pengajuan_cuti where karyawan_id = v_uid and status = 'disetujui'
             and v_tgl between tanggal_mulai and tanggal_selesai) then
    raise exception 'Check-in ditolak: hari ini Anda sedang cuti, sakit, atau izin yang sudah disetujui';
  end if;
  begin
    insert into public.absensi (karyawan_id, tanggal, jam_masuk, status)
    values (v_uid, v_tgl, v_now, public.status_absen(v_now)) returning id into v_id;
  exception when unique_violation then
    raise exception 'Anda sudah check-in hari ini';
  end;
  return v_id;
end $$;

create function public.check_out() returns uuid language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_tgl date := public.tanggal_wib(); r public.absensi;
begin
  if not public.profil_aktif() then raise exception 'Akun tidak aktif'; end if;
  select * into r from public.absensi where karyawan_id = v_uid and tanggal = v_tgl for update;
  if not found then raise exception 'Anda belum check-in hari ini'; end if;
  if r.jam_pulang is not null then raise exception 'Anda sudah check-out hari ini'; end if;
  update public.absensi set jam_pulang = clock_timestamp() where id = r.id;
  return r.id;
end $$;

-- BR-03: hanya HRD yang dapat mengoreksi absensi
create function public.koreksi_absensi(p_karyawan uuid, p_tanggal date, p_jam_masuk timestamptz,
                                       p_jam_pulang timestamptz, p_alasan text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.adalah_hrd() then raise exception 'Hanya HRD yang dapat mengoreksi absensi'; end if;
  if char_length(trim(coalesce(p_alasan, ''))) < 10 then raise exception 'Alasan koreksi minimal 10 karakter'; end if;
  if p_jam_masuk is null then raise exception 'Jam masuk wajib diisi'; end if;
  if p_tanggal > public.tanggal_wib() then raise exception 'Tidak dapat mengoreksi tanggal yang belum terjadi'; end if;
  if (p_jam_masuk at time zone 'Asia/Jakarta')::date <> p_tanggal then raise exception 'Jam masuk harus berada pada tanggal yang dikoreksi'; end if;
  if p_jam_pulang is not null and p_jam_pulang <= p_jam_masuk then raise exception 'Jam pulang harus setelah jam masuk'; end if;
  if not exists (select 1 from public.profiles where id = p_karyawan) then raise exception 'Karyawan tidak ditemukan'; end if;
  insert into public.absensi (karyawan_id, tanggal, jam_masuk, jam_pulang, status, dikoreksi_oleh, alasan_koreksi)
  values (p_karyawan, p_tanggal, p_jam_masuk, p_jam_pulang, public.status_absen(p_jam_masuk), auth.uid(), trim(p_alasan))
  on conflict (karyawan_id, tanggal) do update set
    jam_masuk = excluded.jam_masuk, jam_pulang = excluded.jam_pulang, status = excluded.status,
    dikoreksi_oleh = excluded.dikoreksi_oleh, alasan_koreksi = excluded.alasan_koreksi
  returning id into v_id;
  return v_id;
end $$;

-- BR-04 s/d BR-09: pengajuan baru. Baris kuota dikunci (FOR UPDATE) supaya aman dari pengajuan bersamaan.
create function public.ajukan_cuti(p_jenis text, p_mulai date, p_selesai date, p_alasan text, p_lampiran text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_prof public.profiles; v_kuota public.kuota_cuti;
  v_today date := public.tanggal_wib(); v_hari int; v_tahun int; v_perlu boolean; v_id uuid;
begin
  select * into v_prof from public.profiles where id = v_uid and aktif;
  if not found then raise exception 'Akun tidak aktif'; end if;
  if p_jenis is null or p_jenis not in ('cuti_tahunan','sakit','izin') then raise exception 'Jenis pengajuan tidak valid'; end if;
  if p_mulai is null or p_selesai is null then raise exception 'Tanggal mulai dan selesai wajib diisi'; end if;
  if p_selesai < p_mulai then raise exception 'Tanggal selesai tidak boleh sebelum tanggal mulai'; end if;
  if extract(year from p_mulai) <> extract(year from p_selesai) then raise exception 'Satu pengajuan tidak boleh melewati pergantian tahun'; end if;
  if char_length(trim(coalesce(p_alasan, ''))) < 5 then raise exception 'Alasan minimal 5 karakter'; end if;

  v_tahun := extract(year from p_mulai)::int;
  v_hari := public.hitung_hari_kerja(p_mulai, p_selesai);
  if v_hari < 1 then raise exception 'Rentang tanggal tidak berisi hari kerja (Sabtu, Minggu, dan hari libur tidak dihitung)'; end if;

  perform set_config('app.internal', '1', true);
  insert into public.kuota_cuti (karyawan_id, tahun) values (v_uid, v_tahun) on conflict (karyawan_id, tahun) do nothing;
  select * into v_kuota from public.kuota_cuti where karyawan_id = v_uid and tahun = v_tahun for update;   -- kunci

  if p_jenis = 'cuti_tahunan' then
    if p_mulai - v_today < 3 then raise exception 'Cuti tahunan harus diajukan paling lambat 3 hari kalender sebelum tanggal mulai (H-3)'; end if;
    if p_mulai < (v_prof.tanggal_masuk + interval '12 months')::date then
      raise exception 'Cuti tahunan baru boleh dimulai setelah masa kerja genap 12 bulan (mulai %)',
        to_char((v_prof.tanggal_masuk + interval '12 months')::date, 'DD-MM-YYYY');
    end if;
    if v_hari > v_kuota.jatah_hari - v_kuota.terpakai_hari then
      raise exception 'Sisa kuota cuti tidak cukup: sisa % hari, diajukan % hari', v_kuota.jatah_hari - v_kuota.terpakai_hari, v_hari;
    end if;
  elsif p_jenis = 'izin' then
    if p_mulai - v_today < 1 then raise exception 'Izin harus diajukan paling lambat 1 hari kalender sebelum tanggal mulai (H-1)'; end if;
    if v_hari > 2 then raise exception 'Izin paling banyak 2 hari kerja per pengajuan'; end if;
  else
    if p_mulai > v_today then raise exception 'Pengajuan sakit tidak dapat dibuat sebelum hari mulai sakit'; end if;
    if v_today - p_mulai > 3 then raise exception 'Pengajuan sakit paling lambat 3 hari kalender setelah hari mulai sakit'; end if;
    if v_hari > 1 and coalesce(p_lampiran, '') = '' then raise exception 'Sakit lebih dari 1 hari kerja wajib melampirkan surat dokter'; end if;
  end if;

  if coalesce(p_lampiran, '') <> '' and split_part(p_lampiran, '/', 1) <> v_uid::text then raise exception 'Lampiran tidak valid'; end if;

  if exists (select 1 from public.pengajuan_cuti where karyawan_id = v_uid and status in ('diajukan','disetujui_atasan','disetujui')
             and daterange(tanggal_mulai, tanggal_selesai, '[]') && daterange(p_mulai, p_selesai, '[]')) then
    raise exception 'Tanggal bertabrakan dengan pengajuan lain yang masih berjalan';
  end if;
  if exists (select 1 from public.absensi where karyawan_id = v_uid and tanggal between p_mulai and p_selesai) then
    raise exception 'Pada rentang tanggal tersebut sudah ada data absensi Anda';
  end if;

  -- BR-09: tahap Atasan dilewati bila pemohon Atasan/HRD atau divisi tanpa Atasan aktif
  v_perlu := v_prof.peran = 'karyawan' and exists (
    select 1 from public.divisi d join public.profiles m on m.id = d.manajer_id
    where d.id = v_prof.divisi_id and m.aktif and m.id <> v_uid);

  insert into public.pengajuan_cuti (karyawan_id, jenis, tanggal_mulai, tanggal_selesai, jumlah_hari, alasan, lampiran_path, perlu_atasan)
  values (v_uid, p_jenis, p_mulai, p_selesai, v_hari, trim(p_alasan), nullif(p_lampiran, ''), v_perlu)
  returning id into v_id;

  if p_jenis = 'cuti_tahunan' then
    update public.kuota_cuti set terpakai_hari = terpakai_hari + v_hari where id = v_kuota.id;
  end if;
  return v_id;
end $$;

create function public.kembalikan_kuota(p_karyawan uuid, p_tahun int, p_hari int) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.internal', '1', true);
  update public.kuota_cuti set terpakai_hari = greatest(terpakai_hari - p_hari, 0)
  where karyawan_id = p_karyawan and tahun = p_tahun;
end $$;

-- BR-09: keputusan berjenjang. p_setuju=false berarti tolak (alasan min. 10 karakter).
create function public.putuskan_pengajuan(p_id uuid, p_setuju boolean, p_alasan text default null) returns text
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); me public.profiles; r public.pengajuan_cuti; v_status text;
begin
  select * into me from public.profiles where id = v_uid and aktif;
  if not found then raise exception 'Akun tidak aktif'; end if;
  select * into r from public.pengajuan_cuti where id = p_id for update;
  if not found then raise exception 'Pengajuan tidak ditemukan'; end if;
  if r.karyawan_id = v_uid then raise exception 'Anda tidak dapat memutuskan pengajuan Anda sendiri'; end if;
  if not p_setuju and char_length(trim(coalesce(p_alasan, ''))) < 10 then raise exception 'Alasan penolakan minimal 10 karakter'; end if;

  if r.status = 'diajukan' and r.perlu_atasan then              -- tahap 1: Atasan divisi pemohon
    if me.peran = 'hrd' then raise exception 'HRD tidak boleh melompati tahap Atasan'; end if;
    if not public.atasan_dari(r.karyawan_id) then raise exception 'Hanya Atasan divisi pemohon yang dapat memutuskan tahap pertama'; end if;
    if p_setuju then
      v_status := 'disetujui_atasan';
      update public.pengajuan_cuti set status = v_status, disetujui_atasan_oleh = v_uid, disetujui_atasan_pada = now() where id = r.id;
    else
      v_status := 'ditolak';
      update public.pengajuan_cuti set status = v_status, alasan_penolakan = trim(p_alasan) where id = r.id;
    end if;
  elsif r.status in ('diajukan','disetujui_atasan') then        -- tahap akhir: HRD
    if me.peran <> 'hrd' then raise exception 'Hanya HRD yang dapat memberi keputusan akhir'; end if;
    v_status := case when p_setuju then 'disetujui' else 'ditolak' end;
    update public.pengajuan_cuti set status = v_status, diputuskan_hrd_oleh = v_uid, diputuskan_hrd_pada = now(),
      alasan_penolakan = case when p_setuju then null else trim(p_alasan) end where id = r.id;
  else
    raise exception 'Pengajuan berstatus % tidak dapat diputuskan lagi', r.status;
  end if;

  if v_status = 'ditolak' and r.jenis = 'cuti_tahunan' then
    perform public.kembalikan_kuota(r.karyawan_id, extract(year from r.tanggal_mulai)::int, r.jumlah_hari);
  end if;
  return v_status;
end $$;

-- BR-10: pembatalan
create function public.batalkan_pengajuan(p_id uuid) returns text language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); me public.profiles; r public.pengajuan_cuti;
begin
  select * into me from public.profiles where id = v_uid and aktif;
  if not found then raise exception 'Akun tidak aktif'; end if;
  select * into r from public.pengajuan_cuti where id = p_id for update;
  if not found then raise exception 'Pengajuan tidak ditemukan'; end if;
  if r.status in ('diajukan','disetujui_atasan') then
    if r.karyawan_id <> v_uid then raise exception 'Hanya pemohon yang dapat membatalkan pengajuan yang belum disetujui HRD'; end if;
  elsif r.status = 'disetujui' then
    if me.peran <> 'hrd' then raise exception 'Pengajuan yang sudah disetujui hanya dapat dibatalkan oleh HRD'; end if;
    if r.karyawan_id = v_uid then raise exception 'HRD tidak dapat membatalkan pengajuannya sendiri; minta HRD lain'; end if;
    if public.tanggal_wib() >= r.tanggal_mulai then raise exception 'Pengajuan hanya dapat dibatalkan sebelum tanggal mulai'; end if;
  else
    raise exception 'Pengajuan berstatus % tidak dapat dibatalkan', r.status;
  end if;
  update public.pengajuan_cuti set status = 'dibatalkan', dibatalkan_oleh = v_uid, dibatalkan_pada = now() where id = r.id;
  if r.jenis = 'cuti_tahunan' then
    perform public.kembalikan_kuota(r.karyawan_id, extract(year from r.tanggal_mulai)::int, r.jumlah_hari);
  end if;
  return 'dibatalkan';
end $$;

-- ------------------------------------------------- LAPORAN (invoker: RLS tetap berlaku)
create function public.status_harian(p_mulai date, p_selesai date, p_divisi uuid default null)
returns table (tanggal date, karyawan_id uuid, divisi_id uuid, status text)
language sql stable security invoker set search_path = public as $$
  with batas as (
    select least(p_selesai, case when (clock_timestamp() at time zone 'Asia/Jakarta')::time > time '12:00:00'
                                 then public.tanggal_wib() else public.tanggal_wib() - 1 end) as akhir),
  hari as (
    select g.d::date as d from batas, generate_series(p_mulai::timestamp, batas.akhir::timestamp, interval '1 day') g(d)
    where extract(isodow from g.d) < 6 and not exists (select 1 from public.hari_libur h where h.tanggal = g.d::date))
  select h.d, p.id, p.divisi_id,
    case when a.id is not null then a.status
         when exists (select 1 from public.pengajuan_cuti c where c.karyawan_id = p.id and c.status = 'disetujui'
                      and h.d between c.tanggal_mulai and c.tanggal_selesai) then 'cuti'
         else 'tanpa_keterangan' end
  from hari h
  join public.profiles p on p.tanggal_masuk <= h.d
   and (p.aktif or exists (select 1 from public.absensi x where x.karyawan_id = p.id and x.tanggal = h.d))
  left join public.absensi a on a.karyawan_id = p.id and a.tanggal = h.d
  where p_divisi is null or p.divisi_id = p_divisi
$$;

create function public.laporan_mingguan(p_mulai date, p_selesai date, p_divisi uuid default null)
returns table (minggu date, tepat_waktu int, terlambat int, cuti_izin int, tanpa_keterangan int)
language sql stable security invoker set search_path = public as $$
  select date_trunc('week', s.tanggal)::date,
    (count(*) filter (where s.status = 'hadir'))::int, (count(*) filter (where s.status = 'terlambat'))::int,
    (count(*) filter (where s.status = 'cuti'))::int, (count(*) filter (where s.status = 'tanpa_keterangan'))::int
  from public.status_harian(p_mulai, p_selesai, p_divisi) s group by 1 order by 1
$$;

create function public.laporan_cuti_divisi(p_mulai date, p_selesai date, p_divisi uuid default null)
returns table (bulan text, divisi text, jenis text, hari int)
language sql stable security invoker set search_path = public as $$
  select to_char(c.tanggal_mulai, 'YYYY-MM'), d.nama, c.jenis, sum(c.jumlah_hari)::int
  from public.pengajuan_cuti c join public.profiles p on p.id = c.karyawan_id join public.divisi d on d.id = p.divisi_id
  where c.status = 'disetujui' and c.tanggal_mulai between p_mulai and p_selesai and (p_divisi is null or p.divisi_id = p_divisi)
  group by 1, 2, 3 order by 1, 2, 3
$$;

create function public.laporan_terlambat(p_mulai date, p_selesai date, p_divisi uuid default null, p_batas int default 5)
returns table (karyawan_id uuid, nama text, divisi text, jumlah int)
language sql stable security invoker set search_path = public as $$
  select p.id, p.nama_lengkap, d.nama, count(*)::int as jumlah
  from public.absensi a join public.profiles p on p.id = a.karyawan_id left join public.divisi d on d.id = p.divisi_id
  where a.status = 'terlambat' and a.tanggal between p_mulai and p_selesai and (p_divisi is null or p.divisi_id = p_divisi)
  group by p.id, p.nama_lengkap, d.nama order by jumlah desc, p.nama_lengkap limit p_batas
$$;

-- BR-11: rekap gaji hanya untuk HRD, hanya slip terbit
create function public.rekap_gaji(p_periode date, p_divisi uuid default null)
returns table (divisi text, jumlah_slip int, gaji_pokok numeric, tunjangan numeric, potongan numeric, total_diterima numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.adalah_hrd() then raise exception 'Hanya HRD yang dapat melihat rekap gaji'; end if;
  return query
    select coalesce(d.nama, '-'), count(*)::int, sum(s.gaji_pokok), sum(s.tunjangan), sum(s.potongan), sum(s.total_diterima)
    from public.slip_gaji s join public.profiles p on p.id = s.karyawan_id left join public.divisi d on d.id = p.divisi_id
    where s.status = 'terbit' and s.periode = p_periode and (p_divisi is null or p.divisi_id = p_divisi)
    group by d.nama order by 1;
end $$;

create function public.kartu_ringkasan(p_mulai date, p_selesai date, p_divisi uuid default null)
returns table (persen_tepat_waktu numeric, menunggu int, rata_sisa_kuota numeric)
language sql stable security invoker set search_path = public as $$
  select
    (select round(100.0 * count(*) filter (where s.status = 'hadir') / nullif(count(*) filter (where s.status in ('hadir','terlambat')), 0), 1)
       from public.status_harian(p_mulai, p_selesai, p_divisi) s),
    (select count(*)::int from public.pengajuan_cuti c where (c.status = 'disetujui_atasan' or (c.status = 'diajukan' and not c.perlu_atasan))
       and c.karyawan_id <> auth.uid()),
    (select round(avg(k.jatah_hari - k.terpakai_hari), 1) from public.kuota_cuti k join public.profiles p on p.id = k.karyawan_id
       where k.tahun = extract(year from public.tanggal_wib())::int and p.aktif and (p_divisi is null or p.divisi_id = p_divisi))
$$;

-- ------------------------------------------------------------------ RLS
alter table public.profiles enable row level security;
alter table public.divisi enable row level security;
alter table public.hari_libur enable row level security;
alter table public.kuota_cuti enable row level security;
alter table public.pengajuan_cuti enable row level security;
alter table public.absensi enable row level security;
alter table public.slip_gaji enable row level security;
alter table public.audit_log enable row level security;

create policy profiles_baca on public.profiles for select to authenticated
  using (id = auth.uid() or (public.profil_aktif() and (public.adalah_hrd() or public.atasan_dari(id))));
create policy profiles_tambah on public.profiles for insert to authenticated with check (public.adalah_hrd());
create policy profiles_ubah on public.profiles for update to authenticated using (public.adalah_hrd()) with check (public.adalah_hrd());

create policy divisi_baca on public.divisi for select to authenticated using (public.profil_aktif());
create policy divisi_tulis on public.divisi for all to authenticated using (public.adalah_hrd()) with check (public.adalah_hrd());

create policy libur_baca on public.hari_libur for select to authenticated using (public.profil_aktif());
create policy libur_tulis on public.hari_libur for all to authenticated using (public.adalah_hrd()) with check (public.adalah_hrd());

create policy kuota_baca on public.kuota_cuti for select to authenticated
  using (public.profil_aktif() and (karyawan_id = auth.uid() or public.adalah_hrd() or public.atasan_dari(karyawan_id)));
create policy kuota_tambah on public.kuota_cuti for insert to authenticated with check (public.adalah_hrd());
create policy kuota_ubah on public.kuota_cuti for update to authenticated using (public.adalah_hrd()) with check (public.adalah_hrd());

create policy pengajuan_baca on public.pengajuan_cuti for select to authenticated
  using (public.profil_aktif() and (karyawan_id = auth.uid() or public.adalah_hrd() or public.atasan_dari(karyawan_id)));
create policy absensi_baca on public.absensi for select to authenticated
  using (public.profil_aktif() and (karyawan_id = auth.uid() or public.adalah_hrd() or public.atasan_dari(karyawan_id)));

-- BR-11: slip hanya HRD, atau pemilik bila sudah terbit. Atasan tidak punya akses.
create policy slip_baca on public.slip_gaji for select to authenticated
  using (public.profil_aktif() and (public.adalah_hrd() or (karyawan_id = auth.uid() and status = 'terbit')));
create policy slip_tulis on public.slip_gaji for all to authenticated using (public.adalah_hrd()) with check (public.adalah_hrd());

create policy audit_baca on public.audit_log for select to authenticated using (public.adalah_hrd());

-- --------------------------------------------------------------- HAK AKSES
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke insert, update, delete on public.audit_log, public.absensi, public.pengajuan_cuti from authenticated;  -- hanya lewat fungsi
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;

-- Nama pengguna untuk jejak status (hanya nama, tanpa data lain; dipakai di riwayat pengajuan)
create function public.nama_pengguna(p_ids uuid[]) returns table (id uuid, nama text, peran text)
language sql stable security definer set search_path = public as $$
  select p.id, p.nama_lengkap, p.peran from public.profiles p where public.profil_aktif() and p.id = any(p_ids)
$$;
grant execute on function public.nama_pengguna(uuid[]) to authenticated;
revoke execute on function public.nama_pengguna(uuid[]) from public, anon;
