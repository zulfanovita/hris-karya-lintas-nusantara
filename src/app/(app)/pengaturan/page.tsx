import Link from 'next/link';
import PilihTanggal from '@/components/PilihTanggal';
import { getSesi, wajibPeran } from '@/lib/sesi';
import { buatDivisi, hapusLibur, setManajer, simpanKuota, tambahLibur } from '../../actions';
import { Flash, type SP } from '@/components/ui';
import { hariIniWIB, tgl, tglJam } from '@/lib/format';

const TAB = [['divisi', 'Divisi & Atasan'], ['libur', 'Hari libur'], ['kuota', 'Jatah cuti'], ['audit', 'Audit log']];

export default async function Pengaturan({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const { sb, profil } = await getSesi(); wajibPeran(profil, 'hrd');
  const tab = TAB.some((t) => t[0] === sp.tab) ? sp.tab! : 'divisi';
  const hari = hariIniWIB();
  return (
    <>
      <div className="top"><div><h1>Pengaturan</h1><p className="sub">Hanya HRD</p></div></div>
      <Flash ok={sp.ok} err={sp.err} />
      <div className="tabs">{TAB.map(([k, t]) => <Link key={k} href={`/pengaturan?tab=${k}`} className={tab === k ? 'on' : ''}>{t}</Link>)}</div>
      {tab === 'divisi' && <TabDivisi sb={sb} />}
      {tab === 'libur' && <TabLibur sb={sb} />}
      {tab === 'kuota' && <TabKuota sb={sb} tahun={Number(sp.tahun) || Number(hari.slice(0, 4))} />}
      {tab === 'audit' && <TabAudit sb={sb} sp={sp} />}
    </>
  );
}

async function TabDivisi({ sb }: { sb: any }) {
  const [{ data: d }, { data: p }] = await Promise.all([sb.from('divisi').select('*').order('nama'), sb.from('profiles').select('id,nama_lengkap,peran,divisi_id,aktif')]);
  return (
    <>
      <div className="card scroll"><table><thead><tr><th>Divisi</th><th>Anggota aktif</th><th>Atasan (manajer)</th></tr></thead><tbody>
        {(d ?? []).map((x: any) => {
          const calon = (p ?? []).filter((y: any) => y.peran === 'atasan' && y.aktif && y.divisi_id === x.id);
          return <tr key={x.id}><td><b>{x.nama}</b></td><td>{(p ?? []).filter((y: any) => y.divisi_id === x.id && y.aktif).length}</td><td>
            <form action={setManajer} className="row" style={{ flexWrap: 'nowrap' }}><input type="hidden" name="id" value={x.id} />
              <select name="manajer_id" defaultValue={x.manajer_id ?? ''}><option value="">(tanpa Atasan)</option>{calon.map((c: any) => <option key={c.id} value={c.id}>{c.nama_lengkap}</option>)}</select>
              <button className="sm auto">Simpan</button></form>
            {!calon.length && <span className="muted" style={{ fontSize: 12 }}>Belum ada akun berperan Atasan di divisi ini (ubah peran di Data Karyawan).</span>}</td></tr>; })}
      </tbody></table></div>
      <form action={buatDivisi} className="card row" style={{ maxWidth: 520 }}><div><label>Divisi baru</label><input name="nama" required /></div><div className="auto"><button>Tambah divisi</button></div></form>
    </>
  );
}

async function TabLibur({ sb }: { sb: any }) {
  const { data } = await sb.from('hari_libur').select('*').order('tanggal');
  return (
    <>
      <form action={tambahLibur} className="card row"><div><label>Tanggal</label><PilihTanggal mode="tanggal" name="tanggal" required /></div><div><label>Keterangan</label><input name="keterangan" required /></div>
        <div><label>Jenis</label><select name="jenis"><option value="nasional">Nasional</option><option value="cuti_bersama">Cuti bersama</option><option value="perusahaan">Perusahaan</option></select></div><div className="auto"><button>Tambah</button></div></form>
      <div className="card scroll"><table><thead><tr><th>Tanggal</th><th>Keterangan</th><th>Jenis</th><th></th></tr></thead><tbody>
        {(data ?? []).map((h: any) => <tr key={h.tanggal}><td>{tgl(h.tanggal)}</td><td>{h.keterangan}</td><td>{h.jenis}</td><td><form action={hapusLibur}><input type="hidden" name="tanggal" value={h.tanggal} /><button className="bad sm">Hapus</button></form></td></tr>)}</tbody></table></div>
    </>
  );
}

async function TabKuota({ sb, tahun }: { sb: any; tahun: number }) {
  const [{ data: peg }, { data: kuota }] = await Promise.all([sb.from('profiles').select('id,nama_lengkap,nik_karyawan').eq('aktif', true).order('nama_lengkap'), sb.from('kuota_cuti').select('*').eq('tahun', tahun)]);
  const K = new Map((kuota ?? []).map((k: any) => [k.karyawan_id, k]));
  return (
    <>
      <form method="get" className="card row"><input type="hidden" name="tab" value="kuota" /><div><label>Tahun</label><input type="number" name="tahun" defaultValue={tahun} /></div><div className="auto"><button>Tampilkan</button></div></form>
      <div className="card scroll"><p className="muted" style={{ marginTop: 0 }}>Jatah 0–12 hari kerja per tahun. Sisa jatah tidak dibawa ke tahun berikutnya. Jatah tidak boleh di bawah hari yang sudah terpakai.</p>
        <table><thead><tr><th>Karyawan</th><th>Terpakai</th><th>Jatah {tahun}</th><th></th></tr></thead><tbody>
          {(peg ?? []).map((p: any) => { const k: any = K.get(p.id); return <tr key={p.id}><td>{p.nama_lengkap} <span className="muted">{p.nik_karyawan}</span></td><td>{k?.terpakai_hari ?? 0}</td><td>
            <form action={simpanKuota} className="row" style={{ flexWrap: 'nowrap', maxWidth: 220 }}><input type="hidden" name="karyawan_id" value={p.id} /><input type="hidden" name="tahun" value={tahun} />
              <input type="number" name="jatah_hari" min={0} max={12} defaultValue={k?.jatah_hari ?? 12} /><button className="sm auto">Simpan</button></form></td><td className="muted">{k ? '' : 'belum ada baris (bawaan 12)'}</td></tr>; })}
        </tbody></table></div>
    </>
  );
}

async function TabAudit({ sb, sp }: { sb: any; sp: Record<string, string | undefined> }) {
  const hal = Math.max(1, Number(sp.hal) || 1), per = 40;
  let q = sb.from('audit_log').select('*', { count: 'exact' }).order('id', { ascending: false }).range((hal - 1) * per, hal * per - 1);
  if (sp.aksi) q = q.ilike('aksi', `%${sp.aksi.replace(/[%,]/g, '')}%`);
  if (sp.dari) q = q.gte('dibuat_pada', sp.dari + 'T00:00:00+07:00');
  if (sp.sampai) q = q.lte('dibuat_pada', sp.sampai + 'T23:59:59+07:00');
  const [{ data, count }, { data: peg }] = await Promise.all([q, sb.from('profiles').select('id,nama_lengkap')]);
  const N = new Map<string, any>((peg ?? []).map((p: any) => [p.id, p.nama_lengkap]));
  const link = (h: number) => `/pengaturan?${new URLSearchParams({ tab: 'audit', ...(sp.aksi ? { aksi: sp.aksi } : {}), ...(sp.dari ? { dari: sp.dari } : {}), ...(sp.sampai ? { sampai: sp.sampai } : {}), hal: String(h) })}`;
  return (
    <>
      <form method="get" className="card row"><input type="hidden" name="tab" value="audit" />
        <div><label>Aksi (mis. cuti, slip, koreksi)</label><input name="aksi" defaultValue={sp.aksi ?? ''} /></div>
        <div style={{ minWidth: 270 }}><label>Rentang tanggal</label><PilihTanggal mode="rentang" preset bulan={2} kosong nameDari="dari" nameSampai="sampai" defaultDari={sp.dari ?? ''} defaultSampai={sp.sampai ?? ''} /></div><div className="auto"><button>Filter</button></div></form>
      <div className="card scroll"><table><thead><tr><th>Waktu</th><th>Pelaku</th><th>Aksi</th><th>Tabel</th><th>Perubahan</th></tr></thead><tbody>
        {(data ?? []).map((a: any) => <tr key={a.id}><td className="mono" style={{ whiteSpace: 'nowrap' }}>{tglJam(a.dibuat_pada)}</td><td>{N.get(a.pelaku_id) ?? <span className="muted">sistem</span>}</td><td><b>{a.aksi}</b></td><td>{a.nama_tabel}</td>
          <td><details><summary>lihat</summary><pre style={{ margin: 0, fontSize: 11.5, maxWidth: 420, overflow: 'auto' }}>{a.nilai_sebelum ? 'Sebelum: ' + JSON.stringify(a.nilai_sebelum, null, 1) + '\n' : ''}{a.nilai_sesudah ? 'Sesudah: ' + JSON.stringify(a.nilai_sesudah, null, 1) : ''}</pre></details></td></tr>)}
        {!data?.length && <tr><td colSpan={5} className="muted">Tidak ada catatan.</td></tr>}</tbody></table>
        <div className="row" style={{ marginTop: 12 }}>{hal > 1 && <Link className="btn sec sm auto" href={link(hal - 1)}>← Sebelumnya</Link>}<span className="muted auto">Halaman {hal} · {count ?? 0} catatan</span>{hal * per < (count ?? 0) && <Link className="btn sec sm auto" href={link(hal + 1)}>Berikutnya →</Link>}</div></div>
    </>
  );
}
