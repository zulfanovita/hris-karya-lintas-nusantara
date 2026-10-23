import { NextResponse, type NextRequest } from 'next/server';
import { supa } from '@/lib/supabase/server';
import { ambilHarian, LABEL_HARIAN, saring } from '@/lib/harian';
import { jam } from '@/lib/format';

const esc = (v: any) => { const s = v == null ? '' : String(v); return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const csv = (baris: any[][]) => '\uFEFF' + baris.map((r) => r.map(esc).join(',')).join('\r\n');

// Ekspor laporan ke CSV. Hanya HRD (diperiksa di database lewat adalah_hrd()).
export async function GET(req: NextRequest) {
  const sb = await supa();
  const { data: hrd } = await sb.rpc('adalah_hrd');
  if (!hrd) return new NextResponse('Hanya HRD yang dapat mengekspor laporan', { status: 403 });
  const q = req.nextUrl.searchParams;
  if (q.get('jenis') === 'harian') {            // Absensi Harian (semua karyawan pada satu tanggal)
    const tgl = q.get('tanggal') ?? '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tgl)) return new NextResponse('Tanggal tidak valid', { status: 400 });
    const b = saring(await ambilHarian(sb, tgl), q.get('divisi') || undefined, q.get('status') || undefined);
    const isi = [['NIK', 'Nama', 'Divisi', 'Masuk', 'Pulang', 'Status', 'Catatan'], ...b.map((r) => [r.nik, r.nama, r.divisi, r.masuk ? jam(r.masuk) : '', r.pulang ? jam(r.pulang) : '', LABEL_HARIAN[r.status], r.catatan])];
    return new NextResponse(csv(isi), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="absensi-harian-${tgl}.csv"` } });
  }
  const dari = q.get('dari')!, sampai = q.get('sampai')!, divisi = q.get('divisi') || null, periode = (q.get('periode') || '') + '-01';
  const jenis = q.get('jenis');
  const a = { p_mulai: dari, p_selesai: sampai, p_divisi: divisi };
  let isi: any[][] = [], nama = jenis ?? 'laporan';

  const [{ data: peg }, { data: dv }] = await Promise.all([sb.from('profiles').select('id,nama_lengkap,nik_karyawan'), sb.from('divisi').select('id,nama')]);
  const P = new Map((peg ?? []).map((p) => [p.id, p])), D = new Map((dv ?? []).map((d) => [d.id, d.nama]));

  if (jenis === 'kehadiran') {
    const { data } = await sb.rpc('status_harian', a);
    isi = [['Tanggal', 'NIK', 'Nama', 'Divisi', 'Status'], ...(data ?? []).map((r: any) => [r.tanggal, P.get(r.karyawan_id)?.nik_karyawan, P.get(r.karyawan_id)?.nama_lengkap, D.get(r.divisi_id), r.status])];
  } else if (jenis === 'cuti') {
    const { data } = await sb.rpc('laporan_cuti_divisi', a);
    isi = [['Bulan', 'Divisi', 'Jenis', 'Hari'], ...(data ?? []).map((r: any) => [r.bulan, r.divisi, r.jenis, r.hari])];
  } else if (jenis === 'terlambat') {
    const { data } = await sb.rpc('laporan_terlambat', { ...a, p_batas: 1000 });
    isi = [['Nama', 'Divisi', 'Jumlah terlambat'], ...(data ?? []).map((r: any) => [r.nama, r.divisi, r.jumlah])];
  } else if (jenis === 'gaji') {
    const { data } = await sb.rpc('rekap_gaji', { p_periode: periode, p_divisi: divisi });
    isi = [['Divisi', 'Jumlah slip', 'Gaji pokok', 'Tunjangan', 'Potongan', 'Total diterima'], ...(data ?? []).map((r: any) => [r.divisi, r.jumlah_slip, r.gaji_pokok, r.tunjangan, r.potongan, r.total_diterima])];
    nama += '-' + periode.slice(0, 7);
  } else return new NextResponse('Jenis tidak dikenal', { status: 400 });

  return new NextResponse(csv(isi), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${nama}.csv"` } });
}
