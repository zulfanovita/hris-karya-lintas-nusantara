// Seed data contoh HRIS ke Supabase.
// Pakai:  npm run seed      (membaca .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
// Aman dijalankan berulang (upsert). Jalankan SETELAH migrasi 001 dan 002.
import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import { fileURLToPath } from 'node:url';

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SB_URL || !KEY) { console.error('Isi NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di .env.local'); process.exit(1); }
const sb = createClient(SB_URL, KEY, { auth: { persistSession: false } });
const KATA_SANDI = 'Latihan#2026';

const wb = XLSX.readFile(fileURLToPath(new URL('../data/Data_Contoh_HRIS.xlsx', import.meta.url)));
const baca = (n) => XLSX.utils.sheet_to_json(wb.Sheets[n], { defval: null, raw: true }).map((r) => {
  const o = {};
  for (const [k, v] of Object.entries(r)) if (!k.includes('(bantu)')) o[k] = v === '' ? null : v;
  return o;
});
const cek = (e, ctx) => { if (e) { console.error('GAGAL', ctx, '\n ', e.message); process.exit(1); } };
const potong = (a, n = 100) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

// 1. Akun Auth: satu per baris "Akun Uji"; id baru dari auth.users dipetakan ke id lama pada sheet
const akun = baca('Akun Uji');
const { data: ada } = await sb.auth.admin.listUsers({ perPage: 1000 });
const idPerEmail = new Map((ada?.users ?? []).map((u) => [u.email, u.id]));
for (const a of akun) {
  if (!idPerEmail.has(a.email)) {
    const { data, error } = await sb.auth.admin.createUser({ email: a.email, password: KATA_SANDI, email_confirm: true });
    cek(error, 'buat akun ' + a.email);
    idPerEmail.set(a.email, data.user.id);
  }
  // BR-01: akun nonaktif tidak boleh bisa masuk sama sekali
  await sb.auth.admin.updateUserById(idPerEmail.get(a.email), { ban_duration: a.status === 'aktif' ? 'none' : '876000h' });
}
const profilSheet = baca('profiles');
const peta = new Map(profilSheet.map((p) => [p.id, idPerEmail.get(p.email)]));
const ganti = (v) => { if (typeof v !== 'string') return v; let s = v; for (const [lama, baru] of peta) if (s.includes(lama)) s = s.replaceAll(lama, baru); return s; };
const petakan = (rows) => rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, ganti(v)])));
console.log(`Akun Auth: ${akun.length}`);

// 2. Tabel (urutan sesuai Petunjuk)
const divisiSheet = baca('divisi');
let r = await sb.from('divisi').upsert(divisiSheet.map(({ id, nama }) => ({ id, nama })), { onConflict: 'id' }); cek(r.error, 'divisi');
r = await sb.from('profiles').upsert(petakan(profilSheet).map((p) => ({ ...p, aktif: p.aktif === true || p.aktif === 'TRUE' })), { onConflict: 'id' }); cek(r.error, 'profiles');
for (const d of petakan(divisiSheet)) if (d.manajer_id) { r = await sb.from('divisi').update({ manajer_id: d.manajer_id }).eq('id', d.id); cek(r.error, 'manajer divisi'); }
r = await sb.from('hari_libur').upsert(baca('hari_libur'), { onConflict: 'tanggal' }); cek(r.error, 'hari_libur');

for (const [tabel, konflik] of [['kuota_cuti', 'id'], ['pengajuan_cuti', 'id'], ['absensi', 'id'], ['slip_gaji', 'id']]) {
  const rows = petakan(baca(tabel)).map((x) => (tabel === 'pengajuan_cuti' ? { ...x, perlu_atasan: x.perlu_atasan === true || x.perlu_atasan === 'TRUE' } : x));
  for (const c of potong(rows)) { const res = await sb.from(tabel).upsert(c, { onConflict: konflik }); cek(res.error, tabel); }
  console.log(`${tabel}: ${rows.length} baris`);
}

// 3. Audit log contoh (hanya bila masih kosong; id dibiarkan otomatis)
const { count } = await sb.from('audit_log').select('id', { count: 'exact', head: true });
if (!count) {
  const rows = petakan(baca('audit_log')).map(({ id, ...x }) => ({
    ...x, nilai_sebelum: x.nilai_sebelum ? JSON.parse(x.nilai_sebelum) : null, nilai_sesudah: x.nilai_sesudah ? JSON.parse(x.nilai_sesudah) : null }));
  const res = await sb.from('audit_log').insert(rows); cek(res.error, 'audit_log');
  console.log(`audit_log: ${rows.length} baris`);
}

// 4. Berkas lampiran contoh (agar tautan "Lihat surat dokter" berfungsi)
const PDF = Buffer.from('%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 120]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n4 0 obj<</Length 63>>stream\nBT /F1 14 Tf 20 60 Td (Surat dokter (contoh data)) Tj ET\nendstream endobj\n5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
for (const p of petakan(baca('pengajuan_cuti')).filter((x) => x.lampiran_path)) {
  const pdf = p.lampiran_path.endsWith('.pdf');
  const u = await sb.storage.from('lampiran').upload(p.lampiran_path, pdf ? PDF : PNG, { contentType: pdf ? 'application/pdf' : 'image/png', upsert: true });
  if (u.error) console.warn('lampiran', p.lampiran_path, u.error.message);
}

console.log('\nSelesai. Masuk dengan email dari sheet "Akun Uji" dan kata sandi:', KATA_SANDI);
