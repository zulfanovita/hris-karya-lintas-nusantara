import { supaAdmin } from './supabase/admin';
import { kirimEmail } from './email';
import { LABEL_JENIS, tgl } from './format';

// Semua fungsi menelan galat sendiri: notifikasi tidak boleh menggagalkan aksi utama.
async function muat(id: string) {
  const a = supaAdmin();
  const { data: r } = await a.from('pengajuan_cuti').select('*').eq('id', id).maybeSingle();
  if (!r) return null;
  const { data: p } = await a.from('profiles').select('id,nama_lengkap,email,divisi_id').eq('id', r.karyawan_id).maybeSingle();
  return { a, r, p };
}
const ringkas = (r: any, nama: string) =>
  `<b>${nama}</b> — ${LABEL_JENIS[r.jenis]}, ${tgl(r.tanggal_mulai)}${r.tanggal_selesai !== r.tanggal_mulai ? ' s.d. ' + tgl(r.tanggal_selesai) : ''} (${r.jumlah_hari} hari kerja).`;

async function emailHrd(a: any, kecuali: string) {
  const { data } = await a.from('profiles').select('email,id').eq('peran', 'hrd').eq('aktif', true);
  return (data ?? []).filter((x: any) => x.id !== kecuali).map((x: any) => x.email);
}

export async function notifPengajuanBaru(id: string) {
  try {
    const m = await muat(id); if (!m?.p) return;
    const { a, r, p } = m;
    if (r.perlu_atasan) {
      const { data: d } = await a.from('divisi').select('manajer_id').eq('id', p.divisi_id).maybeSingle();
      const { data: mgr } = d?.manajer_id ? await a.from('profiles').select('email').eq('id', d.manajer_id).maybeSingle() : { data: null };
      await kirimEmail(mgr ? [mgr.email] : [], 'Pengajuan baru menunggu persetujuan Anda', 'Ada pengajuan baru dari anggota divisi Anda: ' + ringkas(r, p.nama_lengkap));
    } else {
      await kirimEmail(await emailHrd(a, p.id), 'Pengajuan menunggu keputusan HRD', 'Pengajuan menunggu keputusan akhir: ' + ringkas(r, p.nama_lengkap));
    }
  } catch (e) { console.error('notif gagal', e); }
}

export async function notifMenungguHrd(id: string) {
  try {
    const m = await muat(id); if (!m?.p) return;
    await kirimEmail(await emailHrd(m.a, m.p.id), 'Pengajuan menunggu keputusan akhir HRD', 'Atasan sudah menyetujui. Menunggu keputusan akhir HRD: ' + ringkas(m.r, m.p.nama_lengkap));
  } catch (e) { console.error('notif gagal', e); }
}

export async function notifStatusKePemohon(id: string) {
  try {
    const m = await muat(id); if (!m?.p) return;
    const { r, p } = m;
    if (!['disetujui', 'ditolak', 'dibatalkan'].includes(r.status)) return;
    const kata = { disetujui: 'DISETUJUI', ditolak: 'DITOLAK', dibatalkan: 'DIBATALKAN' }[r.status as string];
    const alasan = r.status === 'ditolak' && r.alasan_penolakan ? ` Alasan: ${r.alasan_penolakan}` : '';
    await kirimEmail([p.email], `Pengajuan Anda ${kata.toLowerCase()}`, `Pengajuan Anda ${kata}: ${ringkas(r, 'Pengajuan')}${alasan}`);
  } catch (e) { console.error('notif gagal', e); }
}

// BR-11: email slip hanya berisi tautan ke aplikasi, TANPA nominal gaji.
export async function notifSlipTerbit(karyawanIds: string[]) {
  try {
    const a = supaAdmin();
    const { data } = await a.from('profiles').select('email').in('id', karyawanIds);
    await kirimEmail((data ?? []).map((x: any) => x.email), 'Slip gaji Anda sudah terbit', 'Slip gaji terbaru Anda sudah terbit. Silakan masuk ke aplikasi dan buka menu Slip Gaji untuk melihatnya.');
  } catch (e) { console.error('notif gagal', e); }
}
