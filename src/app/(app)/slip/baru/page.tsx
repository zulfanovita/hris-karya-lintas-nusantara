import Link from 'next/link';
import { getSesi, wajibPeran } from '@/lib/sesi';
import { simpanSlip } from '../../../actions';
import { Flash, type SP } from '@/components/ui';
import PilihBulan from '@/components/PilihBulan';
import TombolProses from '@/components/TombolProses';
import { hariIniWIB, namaBulan } from '@/lib/format';

export default async function BaruSlip({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const { sb, profil } = await getSesi();
  wajibPeran(profil, 'hrd');

  const periode = sp.periode && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.periode) ? sp.periode : hariIniWIB().slice(0, 7);
  const [{ data: peg, error: pegError }, { data: slips, error: slipError }] = await Promise.all([
    sb.from('profiles').select('id,nama_lengkap,nik_karyawan').eq('aktif', true).order('nama_lengkap'),
    sb.from('slip_gaji').select('karyawan_id').eq('periode', `${periode}-01`),
  ]);
  if (pegError) throw new Error(`Gagal memuat data karyawan: ${pegError.message}`);
  if (slipError) throw new Error(`Gagal memuat slip periode ini: ${slipError.message}`);

  const sudah = new Set((slips ?? []).map((s) => s.karyawan_id));
  const belum = (peg ?? []).filter((p) => !sudah.has(p.id));
  const labelPeriode = `${namaBulan(Number(periode.slice(5, 7)) - 1)} ${periode.slice(0, 4)}`;

  return (
    <>
      <div className="top"><div className="employee-heading"><Link href={`/slip?periode=${periode}`} className="back-button" aria-label="Kembali ke daftar slip gaji" title="Kembali ke daftar slip gaji"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m0 0 7-7m-7 7 7 7" /></svg></Link><div><h1>Tambah slip gaji</h1>
        <p className="sub">Buat draf slip untuk karyawan pada periode yang dipilih.</p></div></div></div>
      <Flash ok={sp.ok} err={sp.err} />
      <form className="card row" method="get">
        <div><label htmlFor="periode-slip-baru">Periode</label><PilihBulan id="periode-slip-baru" name="periode" defaultValue={periode} /></div>
        <div className="auto"><button>Tampilkan</button></div>
      </form>
      {belum.length > 0 ? (
        <form action={simpanSlip} className="card" style={{ maxWidth: 640 }}>
          <h2>Slip {labelPeriode} ({belum.length} karyawan belum memiliki slip)</h2>
          <input type="hidden" name="periode" value={periode} />
          <div className="f"><label>Karyawan</label><select name="karyawan_id" required defaultValue="">
            <option value="" disabled>Pilih karyawan</option>
            {belum.map((p) => <option key={p.id} value={p.id}>{p.nama_lengkap} ({p.nik_karyawan})</option>)}
          </select></div>
          <div className="row f">
            <div><label>Gaji pokok</label><input type="number" name="gaji_pokok" min={0} required /></div>
            <div><label>Tunjangan</label><input type="number" name="tunjangan" min={0} defaultValue={0} /></div>
            <div><label>Potongan</label><input type="number" name="potongan" min={0} defaultValue={0} /></div>
          </div>
          <div className="f"><label>Catatan rincian</label><input name="catatan" /></div>
          <TombolProses pendingText="Sedang membuat draf...">Buat draf slip</TombolProses>
        </form>
      ) : (
        <div className="card" style={{ maxWidth: 640 }}>
          <p className="muted">{peg?.length ? `Semua karyawan aktif sudah memiliki slip gaji untuk ${labelPeriode}.` : 'Belum ada karyawan aktif yang dapat dibuatkan slip.'}</p>
        </div>
      )}
    </>
  );
}
