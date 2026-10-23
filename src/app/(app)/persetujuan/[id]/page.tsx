import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSesi } from '@/lib/sesi';
import { batalkan, putuskan } from '../../../actions';
import { Badge, Flash, type SP } from '@/components/ui';
import { hariIniWIB, jam, LABEL_JENIS, rentang, tambahHari, tgl, tglJam, tglPanjang } from '@/lib/format';

export default async function Detail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  const { id } = await params; const sp = await searchParams;
  const { sb, profil } = await getSesi();
  const { data: r } = await sb.from('pengajuan_cuti').select('*').eq('id', id).maybeSingle();
  if (!r) notFound();
  const { data: pem } = await sb.from('profiles').select('*').eq('id', r.karyawan_id).maybeSingle();
  const { data: div } = pem?.divisi_id ? await sb.from('divisi').select('nama,manajer_id').eq('id', pem.divisi_id).maybeSingle() : { data: null };
  const { data: kuota } = await sb.from('kuota_cuti').select('*').eq('karyawan_id', r.karyawan_id).eq('tahun', Number(r.tanggal_mulai.slice(0, 4))).maybeSingle();
  const ids = [r.disetujui_atasan_oleh, r.diputuskan_hrd_oleh, r.dibatalkan_oleh, div?.manajer_id].filter(Boolean);
  const { data: nm } = ids.length ? await sb.rpc('nama_pengguna', { p_ids: ids }) : { data: [] };
  const N = (i?: string | null) => (nm ?? []).find((x: any) => x.id === i)?.nama ?? '—';

  // anggota divisi yang sama dengan cuti di sekitar tanggal ini (±14 hari)
  const lihatTim = profil.peran !== 'karyawan';
  const { data: anggota } = lihatTim && pem?.divisi_id ? await sb.from('profiles').select('id,nama_lengkap').eq('divisi_id', pem.divisi_id).neq('id', r.karyawan_id) : { data: [] };
  const idsTim = (anggota ?? []).map((a) => a.id);
  const { data: tim } = idsTim.length
    ? await sb.from('pengajuan_cuti').select('id,karyawan_id,tanggal_mulai,tanggal_selesai,status').in('karyawan_id', idsTim).in('status', ['disetujui_atasan', 'disetujui'])
        .lte('tanggal_mulai', tambahHari(r.tanggal_selesai, 14)).gte('tanggal_selesai', tambahHari(r.tanggal_mulai, -14)).order('tanggal_mulai')
    : { data: [] };
  const namaAng = new Map((anggota ?? []).map((a) => [a.id, a.nama_lengkap]));

  const sendiri = r.karyawan_id === profil.id, hari = hariIniWIB();
  let bisaPutus = false;
  if (!sendiri) {
    if (r.status === 'diajukan' && r.perlu_atasan) bisaPutus = profil.peran === 'atasan' && div?.manajer_id === profil.id;
    else if (['diajukan', 'disetujui_atasan'].includes(r.status)) bisaPutus = profil.peran === 'hrd';
  }
  const bisaBatalHrd = profil.peran === 'hrd' && r.status === 'disetujui' && !sendiri && hari < r.tanggal_mulai;
  const bisaBatalSendiri = sendiri && ['diajukan', 'disetujui_atasan'].includes(r.status);

  const tahap = r.status === 'ditolak' ? 'Ditolak' : r.status === 'dibatalkan' ? 'Dibatalkan' : r.status === 'disetujui' ? 'Selesai (disetujui)'
    : !r.perlu_atasan ? 'Tahap 1 dari 1 (langsung HRD)' : r.status === 'diajukan' ? 'Tahap 1 dari 2 (Atasan, lalu HRD)' : 'Tahap 2 dari 2 (HRD)';
  const hitungKuota = r.jenis === 'cuti_tahunan' && ['diajukan', 'disetujui_atasan', 'disetujui'].includes(r.status);

  // riwayat: langkah yang sudah terjadi (titik penuh) dan yang masih menunggu (titik kosong)
  const langkah: { ok: boolean; x: string; t?: string | null }[] = [{ ok: true, x: `Diajukan oleh ${pem?.nama_lengkap ?? '—'}`, t: r.dibuat_pada }];
  if (r.perlu_atasan) {
    if (r.disetujui_atasan_pada) langkah.push({ ok: true, x: `Disetujui Atasan (${N(r.disetujui_atasan_oleh)})`, t: r.disetujui_atasan_pada });
    else if (r.status === 'ditolak' && !r.diputuskan_hrd_pada) langkah.push({ ok: true, x: 'Ditolak oleh Atasan' });
    else if (r.status === 'diajukan') langkah.push({ ok: false, x: `Menunggu Atasan (${N(div?.manajer_id)})` });
  }
  if (r.diputuskan_hrd_pada) langkah.push({ ok: true, x: `${r.status === 'ditolak' ? 'Ditolak' : 'Disetujui'} HRD (${N(r.diputuskan_hrd_oleh)})`, t: r.diputuskan_hrd_pada });
  else if (['diajukan', 'disetujui_atasan'].includes(r.status)) langkah.push({ ok: false, x: 'Menunggu HRD' });
  if (r.dibatalkan_pada) langkah.push({ ok: true, x: `Dibatalkan oleh ${N(r.dibatalkan_oleh)}`, t: r.dibatalkan_pada });

  return (
    <>
      <div className="top"><div><p className="sub"><Link href="/persetujuan">Persetujuan</Link> / Detail pengajuan</p>
        <h1>{LABEL_JENIS[r.jenis]}: {pem?.nama_lengkap} <Badge s={r.status} /></h1>
        <p className="sub">Diajukan {tgl(r.dibuat_pada)} pukul {jam(r.dibuat_pada)} · {tahap}</p></div></div>
      <Flash ok={sp.ok} err={sp.err} />
      <div className="grid g2" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="fields">
            <div><div className="fl">Pemohon</div>{pem?.nama_lengkap} · {pem?.nik_karyawan} · {pem?.jabatan}</div>
            <div><div className="fl">Kuota cuti pemohon {r.tanggal_mulai.slice(0, 4)}</div>{kuota ? <>Jatah {kuota.jatah_hari} · terpakai {kuota.terpakai_hari}{hitungKuota && ' (termasuk pengajuan ini)'} · sisa <b>{kuota.jatah_hari - kuota.terpakai_hari}</b></> : '—'}</div>
            <div><div className="fl">Tanggal</div>{r.tanggal_selesai === r.tanggal_mulai ? tglPanjang(r.tanggal_mulai) : `${tglPanjang(r.tanggal_mulai)} sampai ${tglPanjang(r.tanggal_selesai)}`}</div>
            <div><div className="fl">Lampiran</div>{r.lampiran_path ? <a target="_blank" href={`/api/lampiran?path=${encodeURIComponent(r.lampiran_path)}`}>Buka surat dokter (tautan sementara)</a> : <span className="muted">Tidak ada</span>}</div>
            <div><div className="fl">Lama</div>{r.jumlah_hari} hari kerja</div>
            <div><div className="fl">Status kerja</div>{pem?.status_kerja === 'tetap' ? 'Tetap' : 'Kontrak'}, masuk {tgl(pem?.tanggal_masuk)}</div>
            <div><div className="fl">Alasan</div>{r.alasan}{r.alasan_penolakan && <div style={{ color: 'var(--red)', marginTop: 6 }}>Alasan penolakan: {r.alasan_penolakan}</div>}</div>
          </div>
          {sendiri && !bisaBatalSendiri && <p className="muted" style={{ margin: '18px 0 0' }}>Ini pengajuan Anda sendiri. Tidak ada yang boleh memutuskan pengajuannya sendiri.</p>}
          {bisaPutus && (<><hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '18px 0' }} /><h2>Keputusan Anda</h2>
            <form action={putuskan}><input type="hidden" name="id" value={r.id} />
              <div className="f"><textarea name="alasan" placeholder="Alasan penolakan (wajib minimal 10 karakter bila menolak)" /></div>
              <div className="acts"><button name="keputusan" value="setuju" formNoValidate>Setujui</button><button name="keputusan" value="tolak" className="sec" formNoValidate>Tolak</button>
                <span className="note">{profil.peran === 'atasan' ? 'Setelah Anda setujui, pengajuan diteruskan ke HRD.' : 'Keputusan HRD bersifat akhir.'}</span></div></form></>)}
          {(bisaBatalHrd || bisaBatalSendiri) && (<><hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '18px 0' }} /><h2>Pembatalan</h2>
            <p className="muted" style={{ marginTop: 0 }}>{bisaBatalHrd ? 'Pengajuan sudah disetujui; HRD dapat membatalkannya sebelum tanggal mulai.' : 'Anda dapat membatalkan selama belum disetujui HRD.'} Kuota cuti tahunan dikembalikan.</p>
            <form action={batalkan}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="kembali" value={`/persetujuan/${r.id}`} /><button className="bad">Batalkan pengajuan</button></form></>)}
        </div>
        <div>
          <div className="card"><h2>Riwayat status</h2>
            <ul className="tl">{langkah.map((x, i) => <li key={i} className={x.ok ? '' : 'pending'}><b>{x.x}</b>{x.t && <div className="muted" style={{ fontSize: 12.5 }}>{tglJam(x.t)}</div>}</li>)}</ul></div>
          {lihatTim && (
            <div className="card scroll"><h2>Tim {div?.nama} yang cuti di sekitar tanggal ini</h2>
              <table><thead><tr><th>Nama</th><th>Tanggal</th><th>Status</th></tr></thead><tbody>
                {(tim ?? []).map((t) => <tr key={t.id}><td>{namaAng.get(t.karyawan_id)}</td><td>{rentang(t.tanggal_mulai, t.tanggal_selesai)}</td><td><Badge s={t.status} /></td></tr>)}
                {!tim?.length && <tr><td colSpan={3} className="muted">Tidak ada anggota tim yang cuti di sekitar tanggal ini.</td></tr>}</tbody></table></div>)}
        </div>
      </div>
      {profil.peran === 'atasan' && <div className="card muted" style={{ fontSize: 13.5 }}>Aturan: Anda hanya bisa memutuskan pengajuan anggota divisi {div?.nama} pada tahap 1. Pengajuan Anda sendiri diputuskan langsung oleh HRD. Data gaji anggota tidak ditampilkan untuk Atasan.</div>}
      {profil.peran === 'hrd' && <div className="card muted" style={{ fontSize: 13.5 }}>Aturan: HRD memberi keputusan akhir setelah Atasan menyetujui, dan tidak boleh melompati tahap Atasan. Tidak ada yang memutuskan pengajuannya sendiri.</div>}
    </>
  );
}
