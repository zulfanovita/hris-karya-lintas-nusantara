-- Helper uji. Mensimulasikan login Supabase: set request.jwt.claim.sub + role authenticated.
drop schema if exists t cascade; create schema t;
create table t.hasil (no serial primary key, kode text, uji text, hasil text, detail text);
create function t.id(p_email text) returns uuid language sql security definer as $$ select id from public.profiles where email = p_email $$;
create function t.pid(p_alasan text) returns uuid language sql security definer as $$ select id from public.pengajuan_cuti where alasan = p_alasan $$;
grant usage on schema t to authenticated;
grant execute on all functions in schema t to authenticated;
-- p_harapan: potongan pesan error yang diharapkan (null = harus berhasil); p_cek: SQL boolean pasca-aksi
create function t.coba(p_kode text, p_uji text, p_email text, p_sql text, p_harapan text default null, p_cek text default null)
returns void language plpgsql as $$
declare v_ok boolean := true; v_detail text := '';
begin
  begin
    perform set_config('request.jwt.claim.sub', t.id(p_email)::text, true);
    execute 'set local role authenticated';
    execute p_sql;
    execute 'reset role';
    if p_harapan is not null then
      insert into t.hasil(kode,uji,hasil,detail) values (p_kode,p_uji,'GAGAL','seharusnya ditolak tetapi berhasil'); return;
    end if;
  exception when others then
    if p_harapan is not null and sqlerrm ilike '%' || p_harapan || '%' then
      v_detail := 'ditolak: ' || sqlerrm;
    else
      insert into t.hasil(kode,uji,hasil,detail) values (p_kode,p_uji,'GAGAL','error tak terduga: ' || sqlerrm); return;
    end if;
  end;
  perform set_config('request.jwt.claim.sub', '', true);
  if p_cek is not null then
    execute p_cek into v_ok;
    v_detail := v_detail || case when v_ok then ' | cek OK' else ' | cek GAGAL' end;
  end if;
  insert into t.hasil(kode,uji,hasil,detail) values (p_kode,p_uji, case when v_ok then 'LULUS' else 'GAGAL' end, nullif(v_detail,''));
end $$;
