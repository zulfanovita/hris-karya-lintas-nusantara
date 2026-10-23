import Link from 'next/link';
import { getSesi, wajibPeran } from '@/lib/sesi';
import { Badge, Flash, type SP } from '@/components/ui';
import { LABEL_PERAN, tgl } from '@/lib/format';

export default async function Karyawan({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const { sb, profil } = await getSesi(); wajibPeran(profil, 'atasan', 'hrd');
  const hrd = profil.peran === 'hrd';
  // Catatan: tidak ada kolom gaji di sini (BR-11). RLS membatasi Atasan ke divisinya sendiri.
  let q = sb.from('profiles').select('id,nik_karyawan,nama_lengkap,email,peran,divisi_id,jabatan,status_kerja,tanggal_masuk,aktif').order('nik_karyawan');
  const cari = (sp.q ?? '').replace(/[,()%]/g, ' ').trim();
  if (cari) q = q.or(`nama_lengkap.ilike.%${cari}%,nik_karyawan.ilike.%${cari}%,email.ilike.%${cari}%,jabatan.ilike.%${cari}%`);
  if (sp.divisi) q = q.eq('divisi_id', sp.divisi);
  if (sp.aktif) q = q.eq('aktif', sp.aktif === '1');
  const [{ data }, { data: divisi }] = await Promise.all([q, sb.from('divisi').select('id,nama').order('nama')]);
  const dv = new Map((divisi ?? []).map((d) => [d.id, d.nama]));

  return (
    <>
      <div className="top"><div><h1>Data Karyawan</h1><p className="sub">{hrd ? 'Kelola data kepegawaian' : 'Anggota divisi Anda (hanya baca)'}</p></div>
        {hrd && <Link href="/karyawan/baru" className="btn">+ Tambah karyawan</Link>}</div>
      <Flash ok={sp.ok} err={sp.err} />
      <form className="card row" method="get">
        <div><label>Cari (nama, NIK, email, jabatan)</label><input name="q" defaultValue={sp.q ?? ''} /></div>
        {hrd && <div><label>Divisi</label><select name="divisi" defaultValue={sp.divisi ?? ''}><option value="">Semua</option>{(divisi ?? []).map((d) => <option key={d.id} value={d.id}>{d.nama}</option>)}</select></div>}
        <div><label>Status akun</label><select name="aktif" defaultValue={sp.aktif ?? ''}><option value="">Semua</option><option value="1">Aktif</option><option value="0">Nonaktif</option></select></div>
        <div className="auto"><button>Cari</button></div></form>
      <div className="card scroll"><table><thead><tr><th>NIK</th><th>Nama</th><th>Divisi</th><th>Jabatan</th><th>Peran</th><th>Status</th><th>Masuk</th><th></th></tr></thead><tbody>
        {(data ?? []).map((p) => <tr key={p.id}><td className="mono">{p.nik_karyawan}</td><td><b>{p.nama_lengkap}</b><div className="muted" style={{ fontSize: 12 }}>{p.email}</div></td>
          <td>{dv.get(p.divisi_id) ?? '-'}</td><td>{p.jabatan}</td><td>{LABEL_PERAN[p.peran]}</td>
          <td>{p.aktif ? <Badge s="hadir" teks={p.status_kerja} /> : <Badge s="ditolak" teks="Nonaktif" />}</td><td>{tgl(p.tanggal_masuk)}</td>
          <td><Link className="btn sm sec" href={`/karyawan/${p.id}`}>Detail</Link></td></tr>)}
        {!data?.length && <tr><td colSpan={8} className="muted">Tidak ada data.</td></tr>}
      </tbody></table></div>
    </>
  );
}
