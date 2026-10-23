import { getSesi } from '@/lib/sesi';
import { batalkan } from '../../actions';
import { Badge, Flash, type SP } from '@/components/ui';
import { hariIniWIB, LABEL_JENIS, tgl, rentang } from '@/lib/format';
import FormCuti from './FormCuti';

export default async function Cuti({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const { sb, profil } = await getSesi();
  const hari = hariIniWIB();
  const [{ data: libur }, { data: kuota }, { data: daftar }] = await Promise.all([
    sb.from('hari_libur').select('tanggal'),
    sb.from('kuota_cuti').select('tahun,jatah_hari,terpakai_hari').eq('karyawan_id', profil.id),
    sb.from('pengajuan_cuti').select('*').eq('karyawan_id', profil.id).order('dibuat_pada', { ascending: false }),
  ]);
  const mK: Record<string, { jatah: number; terpakai: number }> = {};
  (kuota ?? []).forEach((k) => (mK[k.tahun] = { jatah: k.jatah_hari, terpakai: k.terpakai_hari }));

  return (
    <>
      <div className="top"><div><h1>Cuti dan Izin</h1><p className="sub">Ajukan cuti tahunan, sakit, atau izin dan pantau statusnya</p></div></div>
      <Flash ok={sp.ok} err={sp.err} />
      <div className="grid g2" style={{ alignItems: 'start' }}>
        <FormCuti uid={profil.id} libur={(libur ?? []).map((l) => l.tanggal)} kuota={mK} tanggalMasuk={profil.tanggal_masuk} hariIni={hari} />
        <div className="card scroll"><h2>Pengajuan saya</h2>
          <table><thead><tr><th>Jenis</th><th>Tanggal</th><th>Hari</th><th>Status</th><th></th></tr></thead><tbody>
            {(daftar ?? []).map((p) => (
              <tr key={p.id}><td>{LABEL_JENIS[p.jenis]}<div className="muted" style={{ fontSize: 12 }}>{p.alasan}</div>
                  {p.lampiran_path && <a href={`/api/lampiran?path=${encodeURIComponent(p.lampiran_path)}`} target="_blank" style={{ fontSize: 12 }}>Lihat surat dokter</a>}</td>
                <td>{rentang(p.tanggal_mulai, p.tanggal_selesai)}</td><td>{p.jumlah_hari}</td>
                <td><Badge s={p.status} />{p.status === 'ditolak' && <div style={{ fontSize: 12, color: 'var(--red)', maxWidth: 180 }}>{p.alasan_penolakan}</div>}</td>
                <td>{['diajukan', 'disetujui_atasan'].includes(p.status) && (
                  <form action={batalkan}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="kembali" value="/cuti" /><button className="sec sm">Batalkan</button></form>)}</td></tr>))}
            {!daftar?.length && <tr><td colSpan={5} className="muted">Belum ada pengajuan.</td></tr>}
          </tbody></table></div>
      </div>
    </>
  );
}
