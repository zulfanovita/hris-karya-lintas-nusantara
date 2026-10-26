create function public.atasan_satu_divisi(p_karyawan uuid) returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles atasan join public.profiles anggota on anggota.divisi_id = atasan.divisi_id
    where atasan.id = auth.uid() and atasan.aktif and atasan.peran = 'atasan' and anggota.id = p_karyawan)
$$;
revoke all on function public.atasan_satu_divisi(uuid) from public, anon;
grant execute on function public.atasan_satu_divisi(uuid) to authenticated;

drop policy profiles_baca on public.profiles;
create policy profiles_baca on public.profiles for select to authenticated
  using (id = auth.uid() or (public.profil_aktif() and (public.adalah_hrd() or public.atasan_satu_divisi(id) or public.atasan_dari(id))));
