'use server';
import { redirect } from 'next/navigation';
import { supa } from '@/lib/supabase/server';
import { supaAdmin } from '@/lib/supabase/admin';
import { getSesi, wajibPeran } from '@/lib/sesi';
import { ramah, hariIniWIB } from '@/lib/format';
import { notifPengajuanBaru, notifMenungguHrd, notifStatusKePemohon, notifSlipTerbit } from '@/lib/notif';

type Pesan = { ok?: string; err?: string };
const s = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const aman = (p: string, cadangan: string) => (p.startsWith('/') && !p.startsWith('//') ? p : cadangan);

function balik(path: string, p: Pesan): never {
  const u = new URL(path, 'http://x');
  if (p.ok) u.searchParams.set('ok', p.ok);
  if (p.err) u.searchParams.set('err', p.err);
  redirect(u.pathname + u.search);
}

// ------------------------------------------------------------------ AUTH
export async function masuk(fd: FormData) {
  const sb = await supa();
  const { data, error } = await sb.auth.signInWithPassword({ email: s(fd, 'email').toLowerCase(), password: String(fd.get('password') ?? '') });
  if (error) {
    const nonaktif = (error as any).code === 'user_banned' || /banned/i.test(error.message);
    balik('/masuk', { err: nonaktif ? 'Akun Anda nonaktif. Hubungi HRD.' : 'Email atau kata sandi salah.' });
  }
  const { data: p } = await sb.from('profiles').select('aktif').eq('id', data!.user.id).maybeSingle();
  if (!p || !p.aktif) {
    await sb.auth.signOut();
    balik('/masuk', { err: 'Akun Anda nonaktif. Hubungi HRD.' });
  }
  redirect('/dashboard');
}

export async function keluar() {
  const sb = await supa();
  await sb.auth.signOut();
  redirect('/masuk');
}

// -------------------------------------------------------------- ABSENSI
export async function checkIn() {
  const { sb } = await getSesi();
  const { error } = await sb.rpc('check_in');
  balik('/dashboard', error ? { err: ramah(error.message) } : { ok: 'Check-in berhasil. Jam dicatat dari server.' });
}
export async function checkOut() {
  const { sb } = await getSesi();
  const { error } = await sb.rpc('check_out');
  balik('/dashboard', error ? { err: ramah(error.message) } : { ok: 'Check-out berhasil. Hati-hati di jalan.' });
}
export async function koreksi(fd: FormData) {
  const { sb, profil } = await getSesi(); wajibPeran(profil, 'hrd');
  const back = aman(s(fd, 'kembali'), '/absensi');
  const tanggal = s(fd, 'tanggal'), jm = s(fd, 'jam_masuk'), jp = s(fd, 'jam_pulang');
  if (!tanggal || !jm) balik(back, { err: 'Tanggal dan jam masuk wajib diisi.' });
  const { error } = await sb.rpc('koreksi_absensi', {
    p_karyawan: s(fd, 'karyawan_id'), p_tanggal: tanggal,
    p_jam_masuk: `${tanggal}T${jm.slice(0, 5)}:00+07:00`,
    p_jam_pulang: jp ? `${tanggal}T${jp.slice(0, 5)}:00+07:00` : null,
    p_alasan: s(fd, 'alasan'),
  });
  balik(back, error ? { err: ramah(error.message) } : { ok: 'Absensi berhasil dikoreksi dan tercatat di audit log.' });
}

// ----------------------------------------------------- CUTI / PENGAJUAN
// Dipanggil dari komponen klien (setelah lampiran diunggah langsung ke Storage).
export async function ajukan(p: { jenis: string; mulai: string; selesai: string; alasan: string; lampiran: string | null }): Promise<Pesan> {
  const { sb } = await getSesi();
  const { data, error } = await sb.rpc('ajukan_cuti', {
    p_jenis: p.jenis, p_mulai: p.mulai, p_selesai: p.selesai, p_alasan: p.alasan, p_lampiran: p.lampiran,
  });
  if (error) return { err: ramah(error.message) };
  await notifPengajuanBaru(data as string);
  return { ok: 'Pengajuan berhasil dikirim.' };
}

export async function batalkan(fd: FormData) {
  const { sb } = await getSesi();
  const id = s(fd, 'id'), back = aman(s(fd, 'kembali'), '/cuti');
  const { error } = await sb.rpc('batalkan_pengajuan', { p_id: id });
  if (error) balik(back, { err: ramah(error.message) });
  await notifStatusKePemohon(id);
  balik(back, { ok: 'Pengajuan dibatalkan. Kuota cuti tahunan dikembalikan.' });
}

export async function putuskan(fd: FormData) {
  const { sb } = await getSesi();
  const id = s(fd, 'id'), setuju = s(fd, 'keputusan') === 'setuju';
  const { data, error } = await sb.rpc('putuskan_pengajuan', { p_id: id, p_setuju: setuju, p_alasan: s(fd, 'alasan') || null });
  if (error) balik('/persetujuan/' + id, { err: ramah(error.message) });
  if (data === 'disetujui_atasan') await notifMenungguHrd(id);
  else await notifStatusKePemohon(id);
  balik('/persetujuan', { ok: setuju ? 'Pengajuan disetujui.' : 'Pengajuan ditolak. Kuota cuti tahunan dikembalikan.' });
}

// ------------------------------------------------------------ KARYAWAN
export async function buatKaryawan(fd: FormData) {
  const { sb, profil } = await getSesi(); wajibPeran(profil, 'hrd');
  const email = s(fd, 'email').toLowerCase(), password = String(fd.get('password') ?? '');
  if (password.length < 8) balik('/karyawan/baru', { err: 'Kata sandi awal minimal 8 karakter.' });
  let nik = s(fd, 'nik_karyawan').toUpperCase();
  if (!nik) {
    const { data } = await sb.from('profiles').select('nik_karyawan').order('nik_karyawan', { ascending: false }).limit(1);
    const n = parseInt((data?.[0]?.nik_karyawan ?? 'KLN-0000').slice(4), 10) + 1;
    nik = 'KLN-' + String(n).padStart(4, '0');
  }
  const admin = supaAdmin();
  const { data: u, error: e1 } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (e1 || !u.user) balik('/karyawan/baru', { err: 'Gagal membuat akun: ' + (e1?.message ?? '') });
  const { error: e2 } = await sb.from('profiles').insert({
    id: u.user!.id, nik_karyawan: nik, nama_lengkap: s(fd, 'nama_lengkap'), email, nomor_hp: s(fd, 'nomor_hp') || null,
    peran: s(fd, 'peran') || 'karyawan', divisi_id: s(fd, 'divisi_id') || null, jabatan: s(fd, 'jabatan'),
    status_kerja: s(fd, 'status_kerja'), tanggal_masuk: s(fd, 'tanggal_masuk'),
  });
  if (e2) {
    await admin.auth.admin.deleteUser(u.user!.id);
    balik('/karyawan/baru', { err: ramah(e2.message) });
  }
  await sb.from('kuota_cuti').insert({ karyawan_id: u.user!.id, tahun: Number(hariIniWIB().slice(0, 4)), jatah_hari: 12 });
  balik('/karyawan/' + u.user!.id, { ok: `Karyawan ${nik} berhasil dibuat.` });
}

export async function ubahKaryawan(fd: FormData) {
  const { sb, profil } = await getSesi(); wajibPeran(profil, 'hrd');
  const id = s(fd, 'id'), back = '/karyawan/' + id;
  const { error } = await sb.from('profiles').update({
    nama_lengkap: s(fd, 'nama_lengkap'), nomor_hp: s(fd, 'nomor_hp') || null, peran: s(fd, 'peran'),
    divisi_id: s(fd, 'divisi_id') || null, jabatan: s(fd, 'jabatan'), status_kerja: s(fd, 'status_kerja'),
    tanggal_masuk: s(fd, 'tanggal_masuk'),
  }).eq('id', id);
  balik(back, error ? { err: ramah(error.message) } : { ok: 'Data karyawan diperbarui.' });
}

export async function ubahAktif(fd: FormData) {
  const { sb, profil } = await getSesi(); wajibPeran(profil, 'hrd');
  const id = s(fd, 'id'), aktif = s(fd, 'aktif') === 'true', back = '/karyawan/' + id;
  if (id === profil.id) balik(back, { err: 'Anda tidak boleh menonaktifkan akun Anda sendiri.' });
  const { error } = await sb.from('profiles').update({ aktif }).eq('id', id);
  if (error) balik(back, { err: ramah(error.message) });
  // Blokir juga di Supabase Auth supaya akun nonaktif tidak bisa masuk sama sekali
  await supaAdmin().auth.admin.updateUserById(id, { ban_duration: aktif ? 'none' : '876000h' });
  balik(back, { ok: aktif ? 'Akun diaktifkan kembali.' : 'Akun dinonaktifkan. Karyawan tidak bisa masuk.' });
}

// --------------------------------------------------------------- SLIP
const periodeKe = (p: string) => `${p}-01`;

export async function simpanSlip(fd: FormData) {
  const { sb, profil } = await getSesi(); wajibPeran(profil, 'hrd');
  const id = s(fd, 'id'), periode = s(fd, 'periode'), back = '/slip?periode=' + periode;
  const nilai = { gaji_pokok: Number(s(fd, 'gaji_pokok') || 0), tunjangan: Number(s(fd, 'tunjangan') || 0), potongan: Number(s(fd, 'potongan') || 0), catatan: s(fd, 'catatan') || null };
  const { error } = id
    ? await sb.from('slip_gaji').update(nilai).eq('id', id)
    : await sb.from('slip_gaji').insert({ ...nilai, karyawan_id: s(fd, 'karyawan_id'), periode: periodeKe(periode) });
  if (error) balik(back, { err: /duplicate/i.test(error.message) ? 'Slip karyawan tersebut pada periode itu sudah ada.' : ramah(error.message) });
  balik(back, { ok: id ? 'Draf slip diperbarui.' : 'Draf slip dibuat.' });
}

export async function hapusDraf(fd: FormData) {
  const { sb, profil } = await getSesi(); wajibPeran(profil, 'hrd');
  const back = '/slip?periode=' + s(fd, 'periode');
  const { error } = await sb.from('slip_gaji').delete().eq('id', s(fd, 'id')).eq('status', 'draf');
  balik(back, error ? { err: ramah(error.message) } : { ok: 'Draf slip dihapus.' });
}

export async function terbitkan(fd: FormData) {
  const { sb, profil } = await getSesi(); wajibPeran(profil, 'hrd');
  const back = '/slip?periode=' + s(fd, 'periode');
  const q = sb.from('slip_gaji').update({ status: 'terbit' }).eq('status', 'draf');
  const { data, error } = await (s(fd, 'id') ? q.eq('id', s(fd, 'id')) : q.eq('periode', periodeKe(s(fd, 'periode')))).select('id,karyawan_id,nomor_slip');
  if (error) balik(back, { err: ramah(error.message) });
  if (!data?.length) balik(back, { err: 'Tidak ada draf yang bisa diterbitkan.' });
  await notifSlipTerbit(data!.map((x) => x.karyawan_id));
  balik(back, { ok: `${data!.length} slip diterbitkan (${data!.map((x) => x.nomor_slip).join(', ')}).` });
}

export async function salinSlip(fd: FormData) {
  const { sb, profil } = await getSesi(); wajibPeran(profil, 'hrd');
  const periode = s(fd, 'periode'), back = '/slip?periode=' + periode;
  const [y, m] = periode.split('-').map(Number);
  const sebelum = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 10);
  const { data: sumber } = await sb.from('slip_gaji').select('karyawan_id,gaji_pokok,tunjangan,potongan,catatan').eq('periode', sebelum);
  const { data: ada } = await sb.from('slip_gaji').select('karyawan_id').eq('periode', periodeKe(periode));
  const { data: aktif } = await sb.from('profiles').select('id').eq('aktif', true);
  const sudah = new Set((ada ?? []).map((x) => x.karyawan_id)), hidup = new Set((aktif ?? []).map((x) => x.id));
  const baru = (sumber ?? []).filter((x) => !sudah.has(x.karyawan_id) && hidup.has(x.karyawan_id)).map((x) => ({ ...x, periode: periodeKe(periode) }));
  if (!baru.length) balik(back, { err: 'Tidak ada slip periode sebelumnya yang bisa disalin.' });
  const { error } = await sb.from('slip_gaji').insert(baru);
  balik(back, error ? { err: ramah(error.message) } : { ok: `${baru.length} draf slip disalin dari periode sebelumnya.` });
}

// ---------------------------------------------------------- PENGATURAN
export async function buatDivisi(fd: FormData) {
  const { sb, profil } = await getSesi(); wajibPeran(profil, 'hrd');
  const { error } = await sb.from('divisi').insert({ nama: s(fd, 'nama') });
  balik('/pengaturan?tab=divisi', error ? { err: ramah(error.message) } : { ok: 'Divisi ditambahkan.' });
}
export async function setManajer(fd: FormData) {
  const { sb, profil } = await getSesi(); wajibPeran(profil, 'hrd');
  const { error } = await sb.from('divisi').update({ manajer_id: s(fd, 'manajer_id') || null }).eq('id', s(fd, 'id'));
  balik('/pengaturan?tab=divisi', error ? { err: ramah(error.message) } : { ok: 'Atasan divisi diperbarui.' });
}
export async function tambahLibur(fd: FormData) {
  const { sb, profil } = await getSesi(); wajibPeran(profil, 'hrd');
  const { error } = await sb.from('hari_libur').insert({ tanggal: s(fd, 'tanggal'), keterangan: s(fd, 'keterangan'), jenis: s(fd, 'jenis') });
  balik('/pengaturan?tab=libur', error ? { err: ramah(error.message) } : { ok: 'Hari libur ditambahkan.' });
}
export async function hapusLibur(fd: FormData) {
  const { sb, profil } = await getSesi(); wajibPeran(profil, 'hrd');
  const { error } = await sb.from('hari_libur').delete().eq('tanggal', s(fd, 'tanggal'));
  balik('/pengaturan?tab=libur', error ? { err: ramah(error.message) } : { ok: 'Hari libur dihapus.' });
}
export async function simpanKuota(fd: FormData) {
  const { sb, profil } = await getSesi(); wajibPeran(profil, 'hrd');
  const tahun = s(fd, 'tahun');
  const { error } = await sb.from('kuota_cuti').upsert(
    { karyawan_id: s(fd, 'karyawan_id'), tahun: Number(tahun), jatah_hari: Number(s(fd, 'jatah_hari')) },
    { onConflict: 'karyawan_id,tahun' });
  balik('/pengaturan?tab=kuota&tahun=' + tahun, error ? { err: ramah(error.message) } : { ok: 'Jatah cuti disimpan.' });
}
