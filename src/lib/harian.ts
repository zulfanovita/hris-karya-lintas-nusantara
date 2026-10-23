import { hariIniWIB } from './format';

export type BarisHarian = {
  karyawan_id: string; nik: string; nama: string; divisi_id: string | null; divisi: string;
  masuk: string | null; pulang: string | null; status: string; catatan: string;
};
export const LABEL_HARIAN: Record<string, string> = {
  hadir: 'Hadir', terlambat: 'Terlambat', cuti: 'Cuti', sakit: 'Sakit', izin: 'Izin',
  tanpa_keterangan: 'Tanpa keterangan', libur: 'Libur', belum: 'Belum check-in',
};
// kelas warna Badge (memakai kelas badge yang sudah ada)
export const KELAS_HARIAN: Record<string, string> = {
  hadir: 'hadir', terlambat: 'terlambat', cuti: 'cuti', sakit: 'cuti', izin: 'cuti', tanpa_keterangan: 'ditolak', libur: 'belum', belum: 'belum',
};

// Daftar SEMUA karyawan aktif pada satu tanggal (termasuk yang cuti/sakit/izin dan yang tanpa keterangan).
// Memakai sesi pengguna, jadi RLS tetap berlaku: Atasan hanya melihat divisinya, HRD semuanya.
export async function ambilHarian(sb: any, tanggal: string): Promise<BarisHarian[]> {
  const [{ data: peg }, { data: div }, { data: abs }, { data: cuti }, { data: libur }] = await Promise.all([
    sb.from('profiles').select('id,nik_karyawan,nama_lengkap,divisi_id,aktif,tanggal_masuk'),
    sb.from('divisi').select('id,nama'),
    sb.from('absensi').select('*').eq('tanggal', tanggal),
    sb.from('pengajuan_cuti').select('karyawan_id,jenis').eq('status', 'disetujui').lte('tanggal_mulai', tanggal).gte('tanggal_selesai', tanggal),
    sb.from('hari_libur').select('keterangan').eq('tanggal', tanggal).maybeSingle(),
  ]);
  const D = new Map<string, string>((div ?? []).map((d: any) => [d.id, d.nama]));
  const A = new Map<string, any>((abs ?? []).map((a: any) => [a.karyawan_id, a]));
  const C = new Map<string, string>((cuti ?? []).map((c: any) => [c.karyawan_id, c.jenis]));
  const dow = new Date(tanggal + 'T00:00:00Z').getUTCDay();
  const nonKerja = dow === 0 || dow === 6 || !!libur;
  const hari = hariIniWIB();
  const jamIni = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', hourCycle: 'h23' }).format(new Date()));
  const masihBuka = tanggal === hari && jamIni < 12;      // jendela check-in 06.00-12.00 belum tutup

  return (peg ?? [])
    .filter((p: any) => p.tanggal_masuk <= tanggal && (p.aktif || A.has(p.id)))
    .map((p: any): BarisHarian => {
      const a = A.get(p.id), j = C.get(p.id);
      const status = a ? a.status : j ? (j === 'cuti_tahunan' ? 'cuti' : j) : nonKerja ? 'libur' : masihBuka || tanggal > hari ? 'belum' : 'tanpa_keterangan';
      const catatan = a ? (a.dikoreksi_oleh ? 'Dikoreksi: ' + a.alasan_koreksi : !a.jam_pulang ? 'Belum check-out' : '') : '';
      return { karyawan_id: p.id, nik: p.nik_karyawan, nama: p.nama_lengkap, divisi_id: p.divisi_id, divisi: D.get(p.divisi_id) ?? '-', masuk: a?.jam_masuk ?? null, pulang: a?.jam_pulang ?? null, status, catatan };
    })
    .sort((x: BarisHarian, y: BarisHarian) => x.divisi.localeCompare(y.divisi) || x.nama.localeCompare(y.nama));
}

export const saring = (b: BarisHarian[], divisi?: string, status?: string) =>
  b.filter((r) => (!divisi || r.divisi_id === divisi) &&
    (!status || (status === 'cuti_izin_sakit' ? ['cuti', 'sakit', 'izin'].includes(r.status) : r.status === status)));
