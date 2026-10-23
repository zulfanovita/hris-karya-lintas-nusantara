const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const BLN = BULAN.map((b) => b.slice(0, 3));
export const namaBulan = (i: number) => BULAN[i];

export const hariIniWIB = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());

// Jam gaya wireframe: 07.39 (titik, tanpa detik). jamDetik untuk bukti batas 08.15.00 vs 08.15.01.
const fmtJam = (ts: string | Date, detik = false) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', ...(detik ? { second: '2-digit' } : {}), hourCycle: 'h23' })
    .format(new Date(ts)).replace(/:/g, '.');
export const jam = (ts?: string | null) => (ts ? fmtJam(ts) : '-');
export const jamDetik = (ts?: string | null) => (ts ? fmtJam(ts, true) : '-');
export const jamInput = (ts?: string | null) => (ts ? fmtJam(ts).replace('.', ':') : '');   // untuk <input type="time">
export const jamSekarangWIB = () => fmtJam(new Date());

export function tgl(d?: string | null) {
  if (!d) return '-';
  const [y, m, dd] = d.slice(0, 10).split('-').map(Number);
  return `${dd} ${BLN[m - 1]} ${y}`;
}
export function tglPanjang(d: string) {
  const [y, m, dd] = d.slice(0, 10).split('-').map(Number);
  const hari = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][new Date(Date.UTC(y, m - 1, dd)).getUTCDay()];
  return `${hari}, ${dd} ${BLN[m - 1]} ${y}`;
}
export const tglPendek = (d: string) => `${Number(d.slice(8, 10))} ${BLN[Number(d.slice(5, 7)) - 1]}`;
export const rentang = (a: string, b: string) => (a === b ? tgl(a) : `${tgl(a)} sampai ${tgl(b)}`);
export const angka = (n: number | string | null | undefined, maks = 1) =>
  n == null ? '-' : new Intl.NumberFormat('id-ID', { maximumFractionDigits: maks }).format(Number(n));
export const tglJam = (ts?: string | null) =>
  ts ? `${tgl(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date(ts)))} ${jam(ts).slice(0, 5)}` : '-';
export const rupiah = (n: number | string | null | undefined) =>
  'Rp' + new Intl.NumberFormat('id-ID').format(Number(n ?? 0));

export const tambahHari = (d: string, n: number) => {
  const [y, m, dd] = d.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, dd + n)).toISOString().slice(0, 10);
};
export const senin = (d: string) => {
  const [y, m, dd] = d.split('-').map(Number);
  const w = (new Date(Date.UTC(y, m - 1, dd)).getUTCDay() + 6) % 7;
  return tambahHari(d, -w);
};
export const awalBulan = (d: string) => d.slice(0, 8) + '01';

export const LABEL_JENIS: Record<string, string> = { cuti_tahunan: 'Cuti tahunan', sakit: 'Sakit', izin: 'Izin' };
export const LABEL_STATUS: Record<string, string> = {
  diajukan: 'Diajukan', disetujui_atasan: 'Disetujui Atasan', disetujui: 'Disetujui', ditolak: 'Ditolak', dibatalkan: 'Dibatalkan',
};
export const LABEL_PERAN: Record<string, string> = { karyawan: 'Karyawan', atasan: 'Atasan', hrd: 'HRD' };

// Pesan galat database yang ramah pengguna
export function ramah(msg: string) {
  if (/row-level security|permission denied/i.test(msg)) return 'Anda tidak memiliki hak untuk melakukan aksi ini.';
  if (/pengajuan_tidak_beririsan/.test(msg)) return 'Tanggal bertabrakan dengan pengajuan lain yang masih berjalan.';
  if (/kuota_tidak_melebihi_jatah/.test(msg)) return 'Jatah cuti tidak boleh lebih kecil dari hari yang sudah terpakai.';
  if (/duplicate key/i.test(msg)) return 'Data tersebut sudah ada (duplikat).';
  if (/violates check constraint/i.test(msg)) return 'Data tidak memenuhi aturan: ' + msg.replace(/.*constraint /, '');
  return msg;
}

export const inisial = (n: string) => n.split(' ').slice(0, 2).map((x) => x[0]).join('').toUpperCase();
