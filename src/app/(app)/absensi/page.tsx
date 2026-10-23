import Link from 'next/link';
import PilihTanggal from '@/components/PilihTanggal';
import { getSesi } from '@/lib/sesi';
import { koreksi } from '../../actions';
import { Badge, Flash, StatK, type SP } from '@/components/ui';
import PilihBulan from '@/components/PilihBulan';
import { ambilHarian, KELAS_HARIAN, LABEL_HARIAN, saring } from '@/lib/harian';
import { awalBulan, hariIniWIB, jam, jamDetik, jamInput, tglPanjang } from '@/lib/format';

function FormKoreksi({ k, tanggal, jm, jp, kembali }: { k: string; tanggal: string; jm?: string; jp?: string; kembali: string }) {
  return (
    <details><summary>Koreksi</summary>
      <form action={koreksi} style={{ minWidth: 250 }}>
        <input type="hidden" name="karyawan_id" value={k} /><input type="hidden" name="tanggal" value={tanggal} /><input type="hidden" name="kembali" value={kembali} />
        <div className="row f"><div><label>Jam masuk</label><input type="time" name="jam_masuk" defaultValue={jm} required /></div>
          <div><label>Jam pulang</label><input type="time" name="jam_pulang" defaultValue={jp} /></div></div>
        <div className="f"><label>Alasan koreksi (min. 10 karakter)</label><input name="alasan" required minLength={10} /></div>
        <button className="sm">Simpan koreksi</button>
      </form>
    </details>
  );
}

export default async function Absensi({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const { sb, profil } = await getSesi();
  const hari = hariIniWIB(), hrd = profil.peran === 'hrd';
  const tab = sp.tab === 'saya' || profil.peran === 'karyawan' ? 'saya' : 'harian';
  const tabs = profil.peran !== 'karyawan' && (
    <div className="tabs"><Link href="/absensi" className={tab === 'harian' ? 'on' : ''}>{hrd ? 'Semua karyawan' : 'Tim divisi'}</Link><Link href="/absensi?tab=saya" className={tab === 'saya' ? 'on' : ''}>Absensi saya</Link></div>);

  // ---------------- Absensi saya (riwayat per bulan)
  if (tab === 'saya') {
    const bulan = sp.bulan && /^\d{4}-\d{2}$/.test(sp.bulan) ? sp.bulan : hari.slice(0, 7);
    const [y, m] = bulan.split('-').map(Number);
    const akhir = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
    const { data } = await sb.from('absensi').select('*').eq('karyawan_id', profil.id).gte('tanggal', bulan + '-01').lte('tanggal', akhir).order('tanggal', { ascending: false });
    const saya = data ?? [], n = (s: string) => saya.filter((x) => x.status === s).length;
    return (
      <>
        <div className="top"><div><h1>Absensi</h1><p className="sub">Riwayat check-in dan check-out · data dari server, zona WIB</p></div></div>
        <Flash ok={sp.ok} err={sp.err} />{tabs}
        <form className="card row" method="get"><input type="hidden" name="tab" value="saya" /><div><label>Bulan</label><PilihBulan name="bulan" defaultValue={bulan} /></div><div className="auto"><button>Tampilkan</button></div></form>
        <div className="grid g3" style={{ marginBottom: 16 }}><StatK l="Hadir tepat waktu" n={n('hadir')} warna="var(--green)" /><StatK l="Terlambat" n={n('terlambat')} warna="var(--amber)" /><StatK l="Total hari tercatat" n={saya.length} /></div>
        <div className="card scroll"><table><thead><tr><th>Tanggal</th><th>Masuk</th><th>Pulang</th><th>Status</th><th>Catatan</th></tr></thead><tbody>
          {saya.map((r) => <tr key={r.id}><td>{tglPanjang(r.tanggal)}</td><td className="mono" title={jamDetik(r.jam_masuk)}>{jam(r.jam_masuk)}</td>
            <td className="mono">{r.jam_pulang ? jam(r.jam_pulang) : <span className="muted">belum check-out</span>}</td><td><Badge s={r.status} /></td>
            <td className="muted">{r.dikoreksi_oleh ? 'Dikoreksi HRD: ' + r.alasan_koreksi : ''}</td></tr>)}
          {!saya.length && <tr><td colSpan={5} className="muted">Tidak ada data pada bulan ini.</td></tr>}</tbody></table></div>
      </>
    );
  }

  // ---------------- Absensi harian (HRD: semua karyawan, Atasan: divisinya)
  const tanggal = sp.tanggal && /^\d{4}-\d{2}-\d{2}$/.test(sp.tanggal) && sp.tanggal <= hari ? sp.tanggal : hari;
  const [semua, { data: divisi }] = await Promise.all([ambilHarian(sb, tanggal), sb.from('divisi').select('id,nama').order('nama')]);
  const bagi = saring(semua, sp.divisi || undefined);        // kartu ringkasan mengikuti filter divisi
  const baris = saring(semua, sp.divisi || undefined, sp.status || undefined);
  const n = (...s: string[]) => bagi.filter((r) => s.includes(r.status)).length;
  const kembali = `/absensi?tanggal=${tanggal}${sp.divisi ? '&divisi=' + sp.divisi : ''}${sp.status ? '&status=' + sp.status : ''}`;
  const csv = `/api/ekspor?jenis=harian&tanggal=${tanggal}${sp.divisi ? '&divisi=' + sp.divisi : ''}${sp.status ? '&status=' + sp.status : ''}`;

  return (
    <>
      <div className="top"><div><h1>Absensi Harian</h1><p className="sub">{hrd ? 'Semua karyawan aktif' : 'Anggota divisi Anda'} · data dari server, zona WIB</p></div></div>
      <Flash ok={sp.ok} err={sp.err} />{tabs}
      <form className="card row" method="get">
        <div><label>Tanggal</label><PilihTanggal mode="tanggal" name="tanggal" max={hari} defaultValue={tanggal} /></div>
        {hrd && <div><label>Divisi</label><select name="divisi" defaultValue={sp.divisi ?? ''}><option value="">Semua</option>{(divisi ?? []).map((d) => <option key={d.id} value={d.id}>{d.nama}</option>)}</select></div>}
        <div><label>Status</label><select name="status" defaultValue={sp.status ?? ''}><option value="">Semua</option><option value="hadir">Hadir tepat waktu</option><option value="terlambat">Terlambat</option><option value="cuti_izin_sakit">Cuti, sakit, izin</option><option value="tanpa_keterangan">Tanpa keterangan</option></select></div>
        <div className="auto"><button>Terapkan</button></div>{hrd && <div className="auto"><a className="btn sec" href={csv}>Unduh CSV</a></div>}
      </form>
      <p className="muted" style={{ margin: '-6px 0 14px' }}>{tglPanjang(tanggal)}</p>
      <div className="grid g4" style={{ marginBottom: 16 }}>
        <StatK l="Hadir tepat waktu" n={n('hadir')} warna="var(--green)" /><StatK l="Terlambat" n={n('terlambat')} warna="var(--amber)" />
        <StatK l="Cuti, sakit, izin" n={n('cuti', 'sakit', 'izin')} warna="var(--blue)" /><StatK l="Tanpa keterangan" n={n('tanpa_keterangan')} warna="var(--red)" /></div>
      <div className="card scroll"><table><thead><tr><th>NIK</th><th>Nama</th><th>Divisi</th><th>Masuk</th><th>Pulang</th><th>Status</th><th>Catatan</th>{hrd && <th></th>}</tr></thead><tbody>
        {baris.map((r) => <tr key={r.karyawan_id}><td className="mono">{r.nik}</td><td><b>{r.nama}</b></td><td>{r.divisi}</td>
          <td className="mono" title={jamDetik(r.masuk)}>{r.masuk ? jam(r.masuk) : '-'}</td><td className="mono">{r.pulang ? jam(r.pulang) : '-'}</td>
          <td><Badge s={KELAS_HARIAN[r.status]} teks={LABEL_HARIAN[r.status]} /></td><td className="muted">{r.catatan}</td>
          {hrd && <td><FormKoreksi k={r.karyawan_id} tanggal={tanggal} jm={jamInput(r.masuk)} jp={jamInput(r.pulang)} kembali={kembali} /></td>}</tr>)}
        {!baris.length && <tr><td colSpan={8} className="muted">Tidak ada data.</td></tr>}</tbody></table></div>
    </>
  );
}
