-- Bucket privat untuk lampiran surat dokter (BR-08). Jalankan setelah 001_skema.sql.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lampiran', 'lampiran', false, 2097152, array['application/pdf','image/jpeg','image/png'])
on conflict (id) do update set public = false, file_size_limit = 2097152,
  allowed_mime_types = array['application/pdf','image/jpeg','image/png'];

-- folder pertama pada path = id pemohon. Boleh dibuka: pemohon, Atasan divisinya, HRD.
create or replace function public.bisa_lihat_lampiran(p_path text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare v_pemilik uuid;
begin
  begin v_pemilik := split_part(p_path, '/', 1)::uuid; exception when others then return false; end;
  return public.profil_aktif() and (v_pemilik = auth.uid() or public.adalah_hrd() or public.atasan_dari(v_pemilik));
end $$;
grant execute on function public.bisa_lihat_lampiran(text) to authenticated;

drop policy if exists lampiran_unggah on storage.objects;
create policy lampiran_unggah on storage.objects for insert to authenticated
  with check (bucket_id = 'lampiran' and split_part(name, '/', 1) = auth.uid()::text and public.profil_aktif());
drop policy if exists lampiran_baca on storage.objects;
create policy lampiran_baca on storage.objects for select to authenticated
  using (bucket_id = 'lampiran' and public.bisa_lihat_lampiran(name));
revoke execute on function public.bisa_lihat_lampiran(text) from public, anon;
