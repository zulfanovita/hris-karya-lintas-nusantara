import Link from 'next/link';
import PilihTanggal from '@/components/PilihTanggal';
import { getSesi, wajibPeran } from '@/lib/sesi';
import { Flash, StatK, type SP } from '@/components/ui';
import PilihBulan from '@/components/PilihBulan';
import { GrafikCuti, GrafikMingguan } from '@/components/Grafik';
import { angka, awalBulan, hariIniWIB, namaBulan, rupiah, senin, tambahHari, tgl, tglPendek } from '@/lib/format';

export default async function Laporan({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const { sb, profil } = await getSesi(); wajibPeran(profil, 'hrd');
  const hari = hariIniWIB();
  const dari = sp.dari || tambahHari(senin(hari), -21), sampai = sp.sampai || hari;
  const divisiId = sp.divisi || null, bulanAwal = awalBulan(hari), bln = Number(hari.slice(5, 7)) - 1, thn = Number(hari.slice(0, 4));
  const tigaBulan = new Date(Date.UTC(thn, bln - 2, 1)).toISOString().slice(0, 10);          // Agustus-Oktober bila sekarang Oktober
  const akhirBulan = new Date(Date.UTC(thn, bln + 1, 0)).toISOString().slice(0, 10);

  // periode gaji: pilihan HRD, bila kosong = periode slip terbit terakhir
  const { data: terakhir } = await sb.from('slip_gaji').select('periode').eq('status', 'terbit').order('periode', { ascending: false }).limit(1);
  const periode = sp.periode && /^\d{4}-\d{2}$/.test(sp.periode) ? sp.periode : (terakhir?.[0]?.periode ?? hari).slice(0, 7);

  const [{ data: divisi }, { data: kartu }, { data: mgg }, { data: cuti }, { data: telat }, { data: gaji }, { data: pending }, { data: peg }] = await Promise.all([
    sb.from('divisi').select('id,nama').order('nama'),
    sb.rpc('kartu_ringkasan', { p_mulai: bulanAwal, p_selesai: hari, p_divisi: divisiId }),
    sb.rpc('laporan_mingguan', { p_mulai: dari, p_selesai: sampai, p_divisi: divisiId }),
    sb.rpc('laporan_cuti_divisi', { p_mulai: tigaBulan, p_selesai: akhirBulan, p_divisi: divisiId }),
    sb.rpc('laporan_terlambat', { p_mulai: bulanAwal, p_selesai: hari, p_divisi: divisiId }),
    sb.rpc('rekap_gaji', { p_periode: periode + '-01', p_divisi: divisiId }),
    sb.from('pengajuan_cuti').select('karyawan_id').in('status', ['diajukan', 'disetujui_atasan']),
    sb.from('profiles').select('id,divisi_id,aktif'),
  ]);
  const k = kartu?.[0];
  const dv = new Map((peg ?? []).map((p) => [p.id, p.divisi_id]));
  const menunggu = (pending ?? []).filter((x) => !divisiId || dv.get(x.karyawan_id) === divisiId).length;
  const aktif = (peg ?? []).filter((p) => p.aktif && (!divisiId || p.divisi_id === divisiId)).length;

  const seri = [0, 1, 2].map((i) => namaBulan(new Date(Date.UTC(thn, bln - 2 + i, 1)).getUTCMonth()));
  const kodeBulan = [0, 1, 2].map((i) => new Date(Date.UTC(thn, bln - 2 + i, 1)).toISOString().slice(0, 7));
  const perDivisi = (divisi ?? []).filter((d) => !divisiId || d.id === divisiId).map((d) => {
    const baris: any = { divisi: d.nama, total: 0 };
    kodeBulan.forEach((kb, i) => { baris[seri[i]] = (cuti ?? []).filter((c: any) => c.divisi === d.nama && c.bulan === kb).reduce((t: number, c: any) => t + c.hari, 0); baris.total += baris[seri[i]]; });
    return baris;
  }).sort((a: any, b: any) => b.total - a.total);
  const qs = new URLSearchParams({ dari, sampai, periode, ...(divisiId ? { divisi: divisiId } : {}) }).toString();
  const namaDiv = divisiId ? (divisi ?? []).find((d) => d.id === divisiId)?.nama : 'Semua divisi';

  return (
    <>
      <div className="top"><div><h1>Laporan Kehadiran, Cuti, dan Gaji</h1>
        <p className="sub">Rentang {tgl(dari)} sampai {tgl(sampai)} · {namaDiv} · <a href={`/api/ekspor?jenis=kehadiran&${qs}`}>Unduh CSV</a></p></div></div>
      <Flash ok={sp.ok} err={sp.err} />
      <form className="card row" method="get">
        <div style={{ minWidth: 270 }}><label>Rentang tanggal</label><PilihTanggal mode="rentang" preset bulan={2} nameDari="dari" nameSampai="sampai" defaultDari={dari} defaultSampai={sampai} /></div>
        <div><label>Divisi</label><select name="divisi" defaultValue={sp.divisi ?? ''}><option value="">Semua divisi</option>{(divisi ?? []).map((d) => <option key={d.id} value={d.id}>{d.nama}</option>)}</select></div>
        <div><label htmlFor="periode-gaji">Periode gaji</label><PilihBulan id="periode-gaji" name="periode" defaultValue={periode} /></div>
        <div className="auto"><button>Terapkan filter</button></div></form>

      <div className="grid g4" style={{ marginBottom: 16 }}>
        <StatK l={`Tepat waktu ${namaBulan(bln)}`} n={k?.persen_tepat_waktu != null ? angka(k.persen_tepat_waktu) + '%' : '-'} warna="var(--green)" />
        <StatK l="Pengajuan menunggu" n={menunggu} warna="var(--blue)" />
        <StatK l="Rata-rata sisa cuti" n={k?.rata_sisa_kuota != null ? angka(k.rata_sisa_kuota) + ' hari' : '-'} />
        <StatK l="Karyawan aktif" n={aktif} /></div>

      <div className="card"><h2>Kehadiran per minggu (orang-hari)</h2>
        {mgg?.length ? <GrafikMingguan dashboard data={mgg.map((m: any) => ({ ...m, label: tglPendek(m.minggu) }))} /> : <p className="muted">Tidak ada data pada rentang ini.</p>}</div>

      <div className="grid g2" style={{ alignItems: 'start' }}>
        <div className="card"><div className="top" style={{ marginBottom: 4 }}><h2 style={{ margin: 0 }}>Hari cuti, sakit, izin disetujui per divisi</h2><a className="btn sec sm" href={`/api/ekspor?jenis=cuti&${qs}`}>Ekspor CSV</a></div>
          <GrafikCuti data={perDivisi} seri={seri} /></div>
        <div className="card"><div className="top" style={{ marginBottom: 8 }}><h2 style={{ margin: 0 }}>Paling sering terlambat ({namaBulan(bln)})</h2><a className="btn sec sm" href={`/api/ekspor?jenis=terlambat&${qs}`}>Ekspor CSV</a></div>
          <table><thead><tr><th>Nama</th><th>Divisi</th><th className="right">Kali</th></tr></thead><tbody>
            {(telat ?? []).map((t: any) => <tr key={t.karyawan_id}><td>{t.nama}</td><td>{t.divisi}</td><td className="right"><b>{t.jumlah}</b></td></tr>)}
            {!telat?.length && <tr><td colSpan={3} className="muted">Tidak ada keterlambatan.</td></tr>}</tbody></table></div>
      </div>

      <div className="card scroll"><div className="top" style={{ marginBottom: 8 }}><h2 style={{ margin: 0 }}>Rekap gaji {namaBulan(Number(periode.slice(5)) - 1)} {periode.slice(0, 4)} (slip terbit, khusus HRD)</h2>
        <a className="btn sec sm" href={`/api/ekspor?jenis=gaji&${qs}`}>Ekspor CSV</a></div>
        <table><thead><tr><th>Divisi</th><th className="right">Slip</th><th className="right">Pokok + tunjangan</th><th className="right">Potongan</th><th className="right">Total diterima</th></tr></thead><tbody>
          {(gaji ?? []).map((g: any) => <tr key={g.divisi}><td>{g.divisi}</td><td className="right">{g.jumlah_slip}</td><td className="right mono">{rupiah(+g.gaji_pokok + +g.tunjangan)}</td><td className="right mono">{rupiah(g.potongan)}</td><td className="right mono"><b>{rupiah(g.total_diterima)}</b></td></tr>)}
          {!gaji?.length && <tr><td colSpan={5} className="muted">Belum ada slip terbit pada periode ini.</td></tr>}</tbody></table></div>
    </>
  );
}
