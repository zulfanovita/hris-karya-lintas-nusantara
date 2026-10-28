import Link from 'next/link';
import { getSesi } from '@/lib/sesi';
import { batalkan, checkIn, checkOut } from '../../actions';
import { Badge, Flash, type SP } from '@/components/ui';
import { GrafikMingguan } from '@/components/Grafik';
import Ikon from '@/components/Ikon';
import Kalender from '@/components/Kalender';
import { hariIniWIB, inisial, jam, jamDetik, jamSekarangWIB, LABEL_JENIS, namaBulan, rentang, rupiah, senin, tambahHari, tglPanjang, tglPendek, tgl } from '@/lib/format';

const Sc = ({ l, n, sub, i, c, cl }: { l: string; n: React.ReactNode; sub?: string; i: string; c: string; cl: string }) => (
  <div className="sc"><div><div className="l">{l}</div><div className="n">{n}{sub && <small> {sub}</small>}</div></div>
    <div className="ic" style={{ ['--c' as any]: c, ['--cl' as any]: cl }}><Ikon n={i} /></div></div>
);
const flat = { marginBottom: 0 } as const;

export default async function Dashboard({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const { sb, profil } = await getSesi();
  const hari = hariIniWIB(), tahun = Number(hari.slice(0, 4));
  const dow = new Date(hari + 'T00:00:00Z').getUTCDay();
  const m = /^\d{4}-\d{2}$/.test(sp.bln ?? '') ? sp.bln! : hari.slice(0, 7);
  const [ky, kb] = m.split('-').map(Number);
  const mAwal = m + '-01', mAkhir = new Date(Date.UTC(ky, kb, 0)).toISOString().slice(0, 10), bulanIni = hari.slice(0, 7) + '-01';

  const [{ data: abs }, { data: kuota }, { data: pengs }, { data: liburHari }, { data: liburBln }, { data: liburNext }, { data: cutiBln }, { data: absBln }, { data: slip }, { data: abs5 }] = await Promise.all([
    sb.from('absensi').select('*').eq('karyawan_id', profil.id).eq('tanggal', hari).maybeSingle(),
    sb.from('kuota_cuti').select('*').eq('karyawan_id', profil.id).eq('tahun', tahun).maybeSingle(),
    sb.from('pengajuan_cuti').select('*').eq('karyawan_id', profil.id).order('dibuat_pada', { ascending: false }).limit(4),
    sb.from('hari_libur').select('keterangan').eq('tanggal', hari).maybeSingle(),
    sb.from('hari_libur').select('tanggal,keterangan').gte('tanggal', mAwal).lte('tanggal', mAkhir),
    sb.from('hari_libur').select('tanggal,keterangan').gte('tanggal', hari).order('tanggal').limit(4),
    sb.from('pengajuan_cuti').select('tanggal_mulai,tanggal_selesai').eq('karyawan_id', profil.id).eq('status', 'disetujui').lte('tanggal_mulai', mAkhir).gte('tanggal_selesai', mAwal),
    sb.from('absensi').select('status').eq('karyawan_id', profil.id).gte('tanggal', bulanIni),
    sb.from('slip_gaji').select('id,nomor_slip,periode,total_diterima').eq('karyawan_id', profil.id).eq('status', 'terbit').order('periode', { ascending: false }).limit(1),
    sb.from('absensi').select('*').eq('karyawan_id', profil.id).order('tanggal', { ascending: false }).limit(5),
  ]);
  const sisa = kuota ? kuota.jatah_hari - kuota.terpakai_hari : 12, jatah = kuota?.jatah_hari ?? 12;
  const akhirPekan = dow === 0 || dow === 6;
  const hariLibur = akhirPekan || !!liburHari;
  const bisaMasuk = !abs && !hariLibur;
  const bisaPulang = !!abs && !abs.jam_pulang && !hariLibur;
  const libur: Record<string, string> = {}; (liburBln ?? []).forEach((l) => (libur[l.tanggal] = l.keterangan));
  const cuti = new Set<string>();
  (cutiBln ?? []).forEach((c) => { for (let d = c.tanggal_mulai, i = 0; d <= c.tanggal_selesai && i < 60; d = tambahHari(d, 1), i++) cuti.add(d); });
  const tepat = (absBln ?? []).filter((a) => a.status === 'hadir').length, telatSaya = (absBln ?? []).filter((a) => a.status === 'terlambat').length;
  const jamIni = Number(jamSekarangWIB().slice(0, 2));
  const sapa = jamIni < 11 ? 'Selamat pagi' : jamIni < 15 ? 'Selamat siang' : jamIni < 18 ? 'Selamat sore' : 'Selamat malam';
  const sl = slip?.[0];

  let stats: React.ReactNode = null, rail: React.ReactNode, tengah: React.ReactNode = null;
  if (profil.peran === 'atasan' && profil.divisi_id) {
    const [{ data: anggota }, { count: menunggu }] = await Promise.all([
      sb.from('profiles').select('id,nama_lengkap,jabatan').eq('divisi_id', profil.divisi_id).eq('aktif', true).neq('id', profil.id).order('nama_lengkap'),
      sb.from('pengajuan_cuti').select('id', { count: 'exact', head: true }).eq('status', 'diajukan').eq('perlu_atasan', true).neq('karyawan_id', profil.id),
    ]);
    const ids = (anggota ?? []).map((a) => a.id);
    const [{ data: aT }, { data: cT }] = await Promise.all([
      sb.from('absensi').select('karyawan_id,jam_masuk,status').eq('tanggal', hari).in('karyawan_id', ids),
      sb.from('pengajuan_cuti').select('karyawan_id,jenis').eq('status', 'disetujui').lte('tanggal_mulai', hari).gte('tanggal_selesai', hari).in('karyawan_id', ids),
    ]);
    const mA = new Map((aT ?? []).map((x) => [x.karyawan_id, x])), mC = new Map((cT ?? []).map((x) => [x.karyawan_id, x]));
    stats = <div className="grid g3" style={{ marginBottom: 18 }}>
      <Sc l="Tim hadir hari ini" n={mA.size} sub={`/ ${ids.length}`} i="hadir" c="var(--green)" cl="var(--green-l)" />
      <Sc l="Tim cuti / izin / sakit" n={mC.size} i="cuti" c="var(--blue)" cl="var(--blue-l)" />
      <Link href="/persetujuan" style={{ textDecoration: 'none', color: 'inherit' }}><Sc l="Menunggu persetujuan Anda" n={menunggu ?? 0} i="persetujuan" c="var(--amber)" cl="var(--amber-l)" /></Link></div>;
    rail = <div className="card"><div className="top" style={{ marginBottom: 12 }}><h2 style={{ margin: 0 }}>Tim hari ini</h2><Link href="/karyawan" style={{ fontSize: 12.5 }}>Lihat semua</Link></div>
      <div className="rows">{(anggota ?? []).slice(0, 7).map((a) => { const x: any = mA.get(a.id), c: any = mC.get(a.id); return (
        <div className="li" key={a.id}><span className="av sm">{inisial(a.nama_lengkap)}</span><div className="t">{a.nama_lengkap}<small>{x ? `Masuk ${jam(x.jam_masuk)}` : c ? LABEL_JENIS[c.jenis] : 'Belum check-in'}</small></div>
          <span className={'dot ' + (x ? x.status : c ? 'cuti' : '')} /></div>); })}
        {!anggota?.length && <p className="muted" style={{ margin: 0 }}>Belum ada anggota di divisi Anda.</p>}</div></div>;
  } else if (profil.peran === 'hrd') {
    const mulai = tambahHari(senin(hari), -21);
    const [{ data: kartu }, { data: mgg }, { count: aktif }, { count: hadirHariIni }, { count: telat }, { data: antre }, { data: peg }] = await Promise.all([
      sb.rpc('kartu_ringkasan', { p_mulai: mulai, p_selesai: hari }),
      sb.rpc('laporan_mingguan', { p_mulai: mulai, p_selesai: hari }),
      sb.from('profiles').select('id', { count: 'exact', head: true }).eq('aktif', true),
      sb.from('absensi').select('id', { count: 'exact', head: true }).eq('tanggal', hari),
      sb.from('absensi').select('id', { count: 'exact', head: true }).eq('tanggal', hari).eq('status', 'terlambat'),
      sb.from('pengajuan_cuti').select('id,karyawan_id,jenis,jumlah_hari,status').or('status.eq.disetujui_atasan,and(status.eq.diajukan,perlu_atasan.eq.false)').neq('karyawan_id', profil.id).order('dibuat_pada').limit(5),
      sb.from('profiles').select('id,nama_lengkap'),
    ]);
    const N = new Map((peg ?? []).map((p) => [p.id, p.nama_lengkap]));
    stats = <div className="grid g3" style={{ marginBottom: 18 }}>
      <Sc l="Sudah check-in hari ini" n={hadirHariIni ?? 0} sub={`/ ${aktif ?? 0}`} i="hadir" c="var(--green)" cl="var(--green-l)" />
      <Sc l="Terlambat hari ini" n={telat ?? 0} i="tunggu" c="var(--amber)" cl="var(--amber-l)" />
      <Link href="/persetujuan" style={{ textDecoration: 'none', color: 'inherit' }}><Sc l="Antrean keputusan akhir" n={kartu?.[0]?.menunggu ?? 0} i="persetujuan" c="var(--blue)" cl="var(--blue-l)" /></Link></div>;
    rail = <div className="card"><div className="top" style={{ marginBottom: 12 }}><h2 style={{ margin: 0 }}>Menunggu keputusan</h2><Link href="/persetujuan" style={{ fontSize: 12.5 }}>Lihat semua</Link></div>
      <div className="rows">{(antre ?? []).map((a) => (
        <Link key={a.id} href={`/persetujuan/${a.id}`} className="li" style={{ color: 'inherit', textDecoration: 'none' }}><span className="av sm">{inisial(N.get(a.karyawan_id) ?? '?')}</span>
          <div className="t">{N.get(a.karyawan_id)}<small>{LABEL_JENIS[a.jenis]} · {a.jumlah_hari} hari</small></div><Badge s={a.status} teks={a.status === 'disetujui_atasan' ? 'Atasan ✓' : 'Baru'} /></Link>))}
        {!antre?.length && <p className="muted" style={{ margin: 0 }}>Tidak ada antrean. 🎉</p>}</div></div>;
    tengah = <div className="card"><h2>Kehadiran 4 minggu terakhir (hari-orang)</h2><GrafikMingguan dashboard data={(mgg ?? []).map((x: any) => ({ ...x, label: tglPendek(x.minggu) }))} />
      <p className="muted" style={{ marginBottom: 0 }}>Detail dan filter per divisi ada di <Link href="/laporan">Laporan</Link>.</p></div>;
  } else {
    rail = <div className="card"><h2>Hari libur mendatang</h2><div className="rows">{(liburNext ?? []).map((l) => (
      <div className="li" key={l.tanggal}><div className="datechip">{Number(l.tanggal.slice(8))}<small>{tgl(l.tanggal).split(' ')[1]}</small></div><div className="t">{l.keterangan}</div></div>))}
      {!liburNext?.length && <p className="muted" style={{ margin: 0 }}>Belum ada data libur.</p>}</div></div>;
  }

  return (
    <>
      <Flash ok={sp.ok} err={sp.err} />
      <div className="greet"><div><h1>{sapa}, <b>{profil.nama_lengkap.split(' ')[0]}</b></h1><p>{tglPanjang(hari)} · Jam server {jamSekarangWIB()} WIB</p></div></div>
      <div className="dash"><div>
        {profil.peran === 'hrd' && stats}
        {/* 3 kartu utama sesuai wireframe */}
        <div className="grid g3" style={{ marginBottom: 18 }}>
          <div className="card" style={flat}><div className="kl">Absensi hari ini</div>
            {hariLibur ? <p style={{ margin: 0 }}><b>Hari ini libur</b>{liburHari && <>: <b>{liburHari.keterangan}</b></>}</p>
              : abs ? <p style={{ margin: 0 }}>Check-in <b className="mono" title={jamDetik(abs.jam_masuk)}>{jam(abs.jam_masuk)}</b> <Badge s={abs.status} />{abs.jam_pulang && <> · Check-out <b className="mono">{jam(abs.jam_pulang)}</b></>}</p>
              : <p style={{ margin: 0 }} className="muted">Belum check-in</p>}
            {!hariLibur && <p className="muted" style={{ fontSize: 12.5, margin: '8px 0 12px' }}>Check-out bisa dilakukan sampai pukul 23.59 WIB</p>}
            <div className="acts" style={hariLibur ? { marginTop: 12 } : undefined}><form action={checkIn}><button disabled={!bisaMasuk}>Check-in</button></form>
              <form action={checkOut}><button className="sec" disabled={!bisaPulang}>Check-out</button></form></div></div>
          <div className="card" style={flat}><div className="kl">Sisa cuti tahunan {tahun}</div><div className="big2">{sisa} <small>dari {jatah} hari</small></div>
            <p className="muted" style={{ margin: '8px 0 0' }}>{kuota?.terpakai_hari ?? 0} hari terpakai atau sedang diajukan</p></div>
          <div className="card" style={flat}><div className="kl">Kehadiran {namaBulan(Number(hari.slice(5, 7)) - 1)}</div><div className="big2">{tepat} <small>tepat waktu</small></div>
            <p className="muted" style={{ margin: '8px 0 0' }}>{telatSaya} kali terlambat · batas jam masuk 08.15</p></div>
        </div>
        {profil.peran !== 'hrd' && stats}{tengah}
        <div className="card scroll"><div className="top" style={{ marginBottom: 10 }}><h2 style={{ margin: 0 }}>Pengajuan saya</h2><Link href="/cuti" className="btn sm">+ Ajukan cuti atau izin</Link></div>
          {!pengs?.length ? <p className="muted" style={{ margin: 0 }}>Belum ada pengajuan.</p> : (
            <table><thead><tr><th>Jenis</th><th>Tanggal</th><th>Lama</th><th>Status</th><th></th></tr></thead><tbody>
              {pengs.map((p) => <tr key={p.id}><td>{LABEL_JENIS[p.jenis]}</td><td>{rentang(p.tanggal_mulai, p.tanggal_selesai)}</td><td>{p.jumlah_hari} hari</td><td><Badge s={p.status} /></td>
                <td>{['diajukan', 'disetujui_atasan'].includes(p.status) && <form action={batalkan}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="kembali" value="/dashboard" /><button className="sec sm">Batalkan</button></form>}</td></tr>)}
            </tbody></table>)}</div>
        <div className="grid g12">
          <div className="card payroll-card" style={flat}><div className="kl">Slip gaji terakhir</div>
                <div className="payroll-body">
                  {sl ? (<>
                    <div className="payroll-item"><div className="fl">Periode</div><div className="payroll-period">{namaBulan(Number(sl.periode.slice(5, 7)) - 1)} {sl.periode.slice(0, 4)} · {sl.nomor_slip}</div></div>
                    <div className="payroll-item"><div className="fl">Total diterima</div><div className="big2 payroll-amount">{rupiah(sl.total_diterima)}</div></div>
                    <Link href={`/slip/${sl.id}`} className="btn sm">Lihat dan unduh slip</Link>
                  </>) : <p className="muted" style={{ margin: 0 }}>Belum ada slip yang terbit.</p>}
                  <p className="muted payroll-note">Slip hanya bisa dilihat oleh Anda dan HRD.</p>
                </div></div>
          <div className="card scroll" style={flat}><div className="kl">Absensi 5 hari terakhir</div>
            <table><thead><tr><th>Tanggal</th><th>Masuk</th><th>Pulang</th><th>Status</th></tr></thead><tbody>
              {(abs5 ?? []).map((a) => <tr key={a.id}><td>{tglPanjang(a.tanggal)}</td><td className="mono" title={jamDetik(a.jam_masuk)}>{jam(a.jam_masuk)}</td><td className="mono">{a.jam_pulang ? jam(a.jam_pulang) : '-'}</td><td><Badge s={a.status} /></td></tr>)}
              {!abs5?.length && <tr><td colSpan={4} className="muted">Belum ada data absensi.</td></tr>}</tbody></table></div>
        </div>
      </div>
      <div className="rail"><Kalender tahun={ky} bulan={kb} hari={hari} libur={libur} cuti={cuti} />{rail}</div></div>
    </>
  );
}
