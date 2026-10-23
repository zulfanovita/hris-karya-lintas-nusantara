import Link from 'next/link';
import PilihTanggal from '@/components/PilihTanggal';
import { notFound } from 'next/navigation';
import { getSesi, wajibPeran } from '@/lib/sesi';
import { ubahAktif, ubahKaryawan } from '../../../actions';
import { Badge, Flash, type SP } from '@/components/ui';
import { LABEL_JENIS, LABEL_PERAN, tgl, rentang } from '@/lib/format';

export default async function DetailKaryawan({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  const { id } = await params; const sp = await searchParams;
  const { sb, profil } = await getSesi(); wajibPeran(profil, 'atasan', 'hrd');
  const hrd = profil.peran === 'hrd';
  const { data: p } = await sb.from('profiles').select('*').eq('id', id).maybeSingle();
  if (!p) notFound();
  const [{ data: divisi }, { data: kuota }, { data: pengs }, { data: absen }] = await Promise.all([
    sb.from('divisi').select('id,nama').order('nama'),
    sb.from('kuota_cuti').select('*').eq('karyawan_id', id).order('tahun', { ascending: false }),
    sb.from('pengajuan_cuti').select('*').eq('karyawan_id', id).order('dibuat_pada', { ascending: false }).limit(10),
    sb.from('absensi').select('status').eq('karyawan_id', id).gte('tanggal', new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10)),
  ]);
  const dnama = (divisi ?? []).find((d) => d.id === p.divisi_id)?.nama ?? '-';
  const diriSendiri = p.id === profil.id;

  return (
    <>
      <div className="top"><div className="employee-heading"><Link href="/karyawan" className="back-button" aria-label="Kembali ke daftar karyawan" title="Kembali ke daftar karyawan"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m0 0 7-7m-7 7 7 7" /></svg></Link><div><h1>{p.nama_lengkap}</h1><p className="sub">{p.nik_karyawan} · {p.jabatan} · {dnama}</p></div></div>
        {p.aktif ? <Badge s="hadir" teks="Akun aktif" /> : <Badge s="ditolak" teks="Nonaktif" />}</div>
      <Flash ok={sp.ok} err={sp.err} />
      <div className="grid g2" style={{ alignItems: 'start' }}>
        <div className="card"><h2>Data kepegawaian</h2>
          {hrd ? (
            <form action={ubahKaryawan}><input type="hidden" name="id" value={p.id} />
              <div className="f"><label>Nama lengkap</label><input name="nama_lengkap" defaultValue={p.nama_lengkap} required minLength={3} /></div>
              <div className="row f"><div><label>Jabatan</label><input name="jabatan" defaultValue={p.jabatan} required /></div><div><label>Nomor HP</label><input name="nomor_hp" defaultValue={p.nomor_hp ?? ''} /></div></div>
              <div className="row f"><div><label>Divisi</label><select name="divisi_id" defaultValue={p.divisi_id ?? ''}>{(divisi ?? []).map((d) => <option key={d.id} value={d.id}>{d.nama}</option>)}</select></div>
                <div><label>Peran {diriSendiri && '(tidak bisa mengubah sendiri)'}</label><select name="peran" defaultValue={p.peran}>{['karyawan', 'atasan', 'hrd'].map((r) => <option key={r} value={r}>{LABEL_PERAN[r]}</option>)}</select></div></div>
              <div className="row f"><div><label>Status kerja</label><select name="status_kerja" defaultValue={p.status_kerja}><option value="tetap">Tetap</option><option value="kontrak">Kontrak</option></select></div>
                <div><label>Tanggal masuk</label><PilihTanggal mode="tanggal" name="tanggal_masuk" defaultValue={p.tanggal_masuk} required /></div></div>
              <button>Simpan perubahan</button></form>
          ) : (
            <table><tbody><tr><td className="muted">Email</td><td>{p.email}</td></tr><tr><td className="muted">Nomor HP</td><td>{p.nomor_hp ?? '-'}</td></tr>
              <tr><td className="muted">Peran</td><td>{LABEL_PERAN[p.peran]}</td></tr><tr><td className="muted">Status kerja</td><td>{p.status_kerja}</td></tr><tr><td className="muted">Tanggal masuk</td><td>{tgl(p.tanggal_masuk)}</td></tr></tbody></table>)}
          {hrd && !diriSendiri && (
            <form action={ubahAktif} style={{ marginTop: 14 }}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="aktif" value={String(!p.aktif)} />
              <button className={p.aktif ? 'bad sm' : 'sm'}>{p.aktif ? 'Nonaktifkan akun' : 'Aktifkan kembali'}</button></form>)}
        </div>
        <div>
          <div className="card"><h2>Kuota cuti tahunan</h2>
            <table><thead><tr><th>Tahun</th><th>Jatah</th><th>Terpakai</th><th>Sisa</th></tr></thead><tbody>
              {(kuota ?? []).map((k) => <tr key={k.id}><td>{k.tahun}</td><td>{k.jatah_hari}</td><td>{k.terpakai_hari}</td><td><b>{k.jatah_hari - k.terpakai_hari}</b></td></tr>)}
              {!kuota?.length && <tr><td colSpan={4} className="muted">Belum ada data kuota.</td></tr>}</tbody></table></div>
          <div className="card"><h2>Kehadiran 90 hari terakhir</h2><p style={{ margin: 0 }}>Tepat waktu: <b>{(absen ?? []).filter((a) => a.status === 'hadir').length}</b> · Terlambat: <b>{(absen ?? []).filter((a) => a.status === 'terlambat').length}</b></p></div>
        </div>
      </div>
      <div className="card scroll employee-history"><h2>Riwayat pengajuan</h2><table><thead><tr><th>Jenis</th><th>Tanggal</th><th>Hari</th><th>Status</th></tr></thead><tbody>
        {(pengs ?? []).map((r) => <tr key={r.id}><td>{LABEL_JENIS[r.jenis]}</td><td>{rentang(r.tanggal_mulai, r.tanggal_selesai)}</td><td>{r.jumlah_hari}</td><td><Badge s={r.status} /></td></tr>)}
        {!pengs?.length && <tr><td colSpan={4} className="muted">Belum ada pengajuan.</td></tr>}</tbody></table></div>
    </>
  );
}
