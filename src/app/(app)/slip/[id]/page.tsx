import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSesi } from '@/lib/sesi';
import Cetak from '@/components/Cetak';
import { namaBulan, rupiah, tglJam } from '@/lib/format';

export default async function TampilSlip({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { sb } = await getSesi();
  const { data: s } = await sb.from('slip_gaji').select('*').eq('id', id).maybeSingle();   // RLS: hanya HRD / pemilik (terbit)
  if (!s) notFound();
  const { data: p } = await sb.from('profiles').select('nama_lengkap,nik_karyawan,jabatan,divisi_id').eq('id', s.karyawan_id).maybeSingle();
  const { data: d } = p?.divisi_id ? await sb.from('divisi').select('nama').eq('id', p.divisi_id).maybeSingle() : { data: null };
  const periode = `${namaBulan(Number(s.periode.slice(5, 7)) - 1)} ${s.periode.slice(0, 4)}`;
  return (
    <>
      <div className="top noprint"><Link href="/slip" className="back-button" aria-label="Kembali ke daftar slip" title="Kembali ke daftar slip"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m0 0 7-7m-7 7 7 7" /></svg></Link><Cetak /></div>
      <div className="slip">
        <h1>SLIP GAJI</h1><p className="sub">PT Karsa Lintas Nusantara · Periode {periode}</p>
        <table style={{ margin: '16px 0' }}><tbody>
          <tr><td className="muted" style={{ width: 150 }}>Nomor slip</td><td>{s.nomor_slip ?? <i>DRAF — belum terbit</i>}</td></tr>
          <tr><td className="muted">Nama</td><td>{p?.nama_lengkap}</td></tr><tr><td className="muted">NIK</td><td>{p?.nik_karyawan}</td></tr>
          <tr><td className="muted">Jabatan / Divisi</td><td>{p?.jabatan} / {d?.nama ?? '-'}</td></tr></tbody></table>
        <table style={{ borderTop: '2px solid var(--ink)' }}><tbody>
          <tr><td>Gaji pokok</td><td className="right mono">{rupiah(s.gaji_pokok)}</td></tr>
          <tr><td>Tunjangan</td><td className="right mono">{rupiah(s.tunjangan)}</td></tr>
          <tr><td>Potongan</td><td className="right mono">− {rupiah(s.potongan)}</td></tr>
          <tr style={{ borderTop: '2px solid var(--ink)', fontWeight: 700, fontSize: 16 }}><td>Total diterima</td><td className="right mono">{rupiah(s.total_diterima)}</td></tr></tbody></table>
        {s.catatan && <p className="muted" style={{ marginTop: 14 }}>Rincian: {s.catatan}</p>}
        <p className="muted" style={{ fontSize: 12, marginTop: 28 }}>Diterbitkan {s.diterbitkan_pada ? tglJam(s.diterbitkan_pada) : '—'} · Dokumen rahasia, hanya untuk penerima.</p>
      </div>
    </>
  );
}
