#!/usr/bin/env bash
# Menjalankan uji aturan bisnis pada database lokal/stagingan. Contoh: DB="psql -h localhost -U postgres hris" ./jalankan_uji.sh
set -u
DB=${DB:-"psql -h /tmp -p 5433 -U postgres hris"}
D=$(dirname "$0")
$DB -q -f $D/00_helper.sql
$DB -q -f $D/01_uji_bagian1.sql >/dev/null
# TC-21: dua pengajuan bersamaan oleh akun dengan sisa kuota 1 -> hanya satu berhasil
SQL="select set_config('request.jwt.claim.sub',(select id::text from profiles where email='siti.nurhaliza@karsalintas.test'),false); set role authenticated;"
( $DB -At -c "begin; $SQL select public.ajukan_cuti('cuti_tahunan','2026-11-18','2026-11-18','Pengajuan bersama A'); select pg_sleep(2); commit;" >/tmp/par_a.txt 2>&1 ) &
sleep 0.7
( $DB -At -c "begin; $SQL select public.ajukan_cuti('cuti_tahunan','2026-11-19','2026-11-19','Pengajuan bersama B'); commit;" >/tmp/par_b.txt 2>&1 ) &
wait
OK=$($DB -Atc "select count(*) from pengajuan_cuti c join profiles p on p.id=c.karyawan_id where p.email='siti.nurhaliza@karsalintas.test' and c.alasan like 'Pengajuan bersama%'")
ERR=$(cat /tmp/par_a.txt /tmp/par_b.txt | grep -c 'Sisa kuota' || true)
if [ "$OK" = "1" ] && [ "$ERR" = "1" ]; then H=LULUS; else H=GAGAL; fi
$DB -q -c "insert into t.hasil(kode,uji,hasil,detail) values ('TC-21','BR-06 dua pengajuan bersamaan, sisa kuota 1: hanya satu berhasil','$H','berhasil=$OK, ditolak karena kuota=$ERR')"
$DB -q -f $D/02_uji_bagian2.sql >/dev/null
$DB -c "select kode, hasil, uji, left(coalesce(detail,''),90) as detail from t.hasil order by (regexp_replace(kode,'\D','','g'))::int"
$DB -Atc "select 'RINGKASAN: '||count(*) filter (where hasil='LULUS')||' lulus, '||count(*) filter (where hasil<>'LULUS')||' gagal dari '||count(*) from t.hasil"
