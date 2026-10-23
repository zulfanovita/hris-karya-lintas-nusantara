import Link from 'next/link';
import { getSesi } from '@/lib/sesi';
import { hapusDraf, salinSlip, simpanSlip, terbitkan } from '../../actions';
import { Badge, Flash, type SP } from '@/components/ui';
import PilihBulan from '@/components/PilihBulan';
import { hariIniWIB, namaBulan, rupiah } from '@/lib/format';

const labelPeriode = (p: string) => `${namaBulan(Number(p.slice(5, 7)) - 1)} ${p.slice(0, 4)}`;

export default async function Slip({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const { sb, profil } = await getSesi();

  // ---- Karyawan / Atasan: hanya slip sendiri yang sudah terbit (dijaga RLS)
  if (profil.peran !== 'hrd') {
    const { data } = await sb.from('slip_gaji').select('id,nomor_slip,periode,total_diterima').eq('karyawan_id', profil.id).eq('status', 'terbit').order('periode', { ascending: false });
    return (
      <>
        <div className="top"><div><h1>Slip Gaji</h1><p className="sub">Hanya Anda dan HRD yang dapat melihat slip gaji Anda</p></div></div>
        <Flash ok={sp.ok} err={sp.err} />
        <div className="card scroll"><table><thead><tr><th>Periode</th><th>Nomor slip</th><th className="right">Total diterima</th><th></th></tr></thead><tbody>
          {(data ?? []).map((s) => <tr key={s.id}><td>{labelPeriode(s.periode)}</td><td className="mono">{s.nomor_slip}</td><td className="right mono">{rupiah(s.total_diterima)}</td><td><Link className="btn sm" href={`/slip/${s.id}`}>Lihat / cetak</Link></td></tr>)}
          {!data?.length && <tr><td colSpan={4} className="muted">Belum ada slip yang terbit.</td></tr>}</tbody></table></div>
      </>
    );
  }

  // ---- HRD
  const periode = sp.periode && /^\d{4}-\d{2}$/.test(sp.periode) ? sp.periode : hariIniWIB().slice(0, 7);
  const [{ data: slips }, { data: peg }] = await Promise.all([
    sb.from('slip_gaji').select('*').eq('periode', periode + '-01').order('nomor_slip', { nullsFirst: false }),
    sb.from('profiles').select('id,nama_lengkap,nik_karyawan,aktif').order('nama_lengkap'),
  ]);
  const nama = new Map((peg ?? []).map((p) => [p.id, p]));
  const sudah = new Set((slips ?? []).map((s) => s.karyawan_id));
  const belum = (peg ?? []).filter((p) => p.aktif && !sudah.has(p.id));
  const draf = (slips ?? []).filter((s) => s.status === 'draf');
  const f = (s: any) => (
    <form action={simpanSlip}><input type="hidden" name="id" value={s?.id ?? ''} /><input type="hidden" name="periode" value={periode} />
      <div className="row f">
        <div><label>Gaji pokok</label><input type="number" name="gaji_pokok" min={0} required defaultValue={s?.gaji_pokok ?? ''} /></div>
        <div><label>Tunjangan</label><input type="number" name="tunjangan" min={0} defaultValue={s?.tunjangan ?? 0} /></div>
        <div><label>Potongan</label><input type="number" name="potongan" min={0} defaultValue={s?.potongan ?? 0} /></div></div>
      <div className="f"><label>Catatan rincian</label><input name="catatan" defaultValue={s?.catatan ?? ''} /></div>
      {!s && <div className="f"><label>Karyawan</label><select name="karyawan_id" required>{belum.map((p) => <option key={p.id} value={p.id}>{p.nama_lengkap} ({p.nik_karyawan})</option>)}</select></div>}
      <button className="sm">{s ? 'Simpan draf' : 'Buat draf slip'}</button></form>
  );

  return (
    <>
      <div className="top"><div><h1>Slip Gaji</h1><p className="sub">Data rahasia — hanya HRD dan karyawan pemilik (slip terbit)</p></div></div>
      <Flash ok={sp.ok} err={sp.err} />
      <form className="card row" method="get"><div><label>Periode</label><PilihBulan name="periode" defaultValue={periode} /></div><div className="auto"><button>Tampilkan</button></div></form>
      <div className="card scroll">
        <div className="top" style={{ marginBottom: 8 }}><h2 style={{ margin: 0 }}>Slip {labelPeriode(periode)} ({slips?.length ?? 0})</h2>
          <div className="row" style={{ flex: '0 0 auto' }}>
            <form action={salinSlip}><input type="hidden" name="periode" value={periode} /><button className="sec sm">Salin dari periode sebelumnya</button></form>
            {draf.length > 0 && <form action={terbitkan}><input type="hidden" name="periode" value={periode} /><button className="sm">Terbitkan semua draf ({draf.length})</button></form>}</div></div>
        <table><thead><tr><th>Nomor</th><th>Karyawan</th><th className="right">Gaji pokok</th><th className="right">Tunjangan</th><th className="right">Potongan</th><th className="right">Diterima</th><th>Status</th><th></th></tr></thead><tbody>
          {(slips ?? []).map((s) => <tr key={s.id}><td className="mono">{s.nomor_slip ?? <span className="muted">—</span>}</td><td>{nama.get(s.karyawan_id)?.nama_lengkap}</td>
            <td className="right mono">{rupiah(s.gaji_pokok)}</td><td className="right mono">{rupiah(s.tunjangan)}</td><td className="right mono">{rupiah(s.potongan)}</td><td className="right mono"><b>{rupiah(s.total_diterima)}</b></td><td><Badge s={s.status} /></td>
            <td style={{ minWidth: 150 }}>{s.status === 'terbit' ? <Link className="btn sm sec" href={`/slip/${s.id}`}>Lihat</Link> : (
              <div className="row" style={{ gap: 6 }}>
                <form action={terbitkan}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="periode" value={periode} /><button className="sm">Terbitkan</button></form>
                <details><summary>Ubah</summary>{f(s)}<form action={hapusDraf}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="periode" value={periode} /><button className="bad sm" style={{ marginTop: 8 }}>Hapus draf</button></form></details></div>)}</td></tr>)}
          {!slips?.length && <tr><td colSpan={8} className="muted">Belum ada slip pada periode ini.</td></tr>}
        </tbody></table></div>
      {belum.length > 0 && <div className="card" style={{ maxWidth: 640 }}><h2>Slip baru ({belum.length} karyawan aktif belum punya slip)</h2>{f(null)}</div>}
    </>
  );
}
