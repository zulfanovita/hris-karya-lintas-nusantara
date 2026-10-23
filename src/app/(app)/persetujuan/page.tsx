import Link from 'next/link';
import { getSesi, wajibPeran } from '@/lib/sesi';
import { Badge, Flash, type SP } from '@/components/ui';
import { LABEL_JENIS, tgl, rentang } from '@/lib/format';

export default async function Persetujuan({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const { sb, profil } = await getSesi(); wajibPeran(profil, 'atasan', 'hrd');
  const semua = sp.tab === 'semua';
  let q = sb.from('pengajuan_cuti').select('*').order('dibuat_pada', { ascending: false }).limit(200);
  if (!semua) {
    q = profil.peran === 'atasan'
      ? q.eq('status', 'diajukan').eq('perlu_atasan', true).neq('karyawan_id', profil.id)
      : q.or('status.eq.disetujui_atasan,and(status.eq.diajukan,perlu_atasan.eq.false)').neq('karyawan_id', profil.id);
  } else {
    if (sp.status) q = q.eq('status', sp.status);
    if (sp.jenis) q = q.eq('jenis', sp.jenis);
  }
  const [{ data }, { data: peg }] = await Promise.all([q, sb.from('profiles').select('id,nama_lengkap,jabatan')]);
  const nama = new Map((peg ?? []).map((p) => [p.id, p]));
  const cari = (sp.q ?? '').toLowerCase();
  const baris = (data ?? []).filter((r) => !cari || (nama.get(r.karyawan_id)?.nama_lengkap ?? '').toLowerCase().includes(cari));

  return (
    <>
      <div className="top"><div><h1>Persetujuan</h1><p className="sub">{profil.peran === 'atasan' ? 'Tahap pertama: pengajuan anggota divisi Anda' : 'Keputusan akhir pengajuan'}</p></div></div>
      <Flash ok={sp.ok} err={sp.err} />
      <div className="tabs"><Link href="/persetujuan" className={!semua ? 'on' : ''}>Menunggu saya</Link><Link href="/persetujuan?tab=semua" className={semua ? 'on' : ''}>Semua / riwayat</Link></div>
      {semua && (
        <form className="card row" method="get"><input type="hidden" name="tab" value="semua" />
          <div><label>Cari nama</label><input name="q" defaultValue={sp.q ?? ''} /></div>
          <div><label>Status</label><select name="status" defaultValue={sp.status ?? ''}><option value="">Semua</option>{['diajukan', 'disetujui_atasan', 'disetujui', 'ditolak', 'dibatalkan'].map((s) => <option key={s}>{s}</option>)}</select></div>
          <div><label>Jenis</label><select name="jenis" defaultValue={sp.jenis ?? ''}><option value="">Semua</option><option value="cuti_tahunan">Cuti tahunan</option><option value="sakit">Sakit</option><option value="izin">Izin</option></select></div>
          <div className="auto"><button>Terapkan</button></div></form>
      )}
      <div className="card scroll"><table><thead><tr><th>Pemohon</th><th>Jenis</th><th>Tanggal</th><th>Hari</th><th>Status</th><th>Diajukan</th><th></th></tr></thead><tbody>
        {baris.map((r) => <tr key={r.id}><td><b>{nama.get(r.karyawan_id)?.nama_lengkap}</b><div className="muted" style={{ fontSize: 12 }}>{nama.get(r.karyawan_id)?.jabatan}</div></td>
          <td>{LABEL_JENIS[r.jenis]}</td><td>{rentang(r.tanggal_mulai, r.tanggal_selesai)}</td><td>{r.jumlah_hari}</td>
          <td><Badge s={r.status} /></td><td className="muted">{tgl(r.dibuat_pada)}</td><td><Link className="btn sm" href={`/persetujuan/${r.id}`}>Detail</Link></td></tr>)}
        {!baris.length && <tr><td colSpan={7} className="muted">{semua ? 'Tidak ada data.' : 'Tidak ada pengajuan yang menunggu Anda. 🎉'}</td></tr>}
      </tbody></table></div>
    </>
  );
}
