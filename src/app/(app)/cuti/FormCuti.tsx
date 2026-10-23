'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supaBrowser } from '@/lib/supabase/client';
import { ajukan } from '../../actions';
import PilihTanggal from '@/components/PilihTanggal';

const tambah = (d: string, n: number) => { const [y, m, dd] = d.split('-').map(Number); return new Date(Date.UTC(y, m - 1, dd + n)).toISOString().slice(0, 10); };

export default function FormCuti({ uid, libur, kuota, tanggalMasuk, hariIni }: {
  uid: string; libur: string[]; kuota: Record<string, { jatah: number; terpakai: number }>; tanggalMasuk: string; hariIni: string;
}) {
  const router = useRouter();
  const [jenis, setJenis] = useState('cuti_tahunan');
  const [mulai, setMulai] = useState(''); const [selesai, setSelesai] = useState('');
  const [alasan, setAlasan] = useState(''); const [file, setFile] = useState<File | null>(null);
  const [rk, setRk] = useState(0);
  const [busy, setBusy] = useState(false); const [pesan, setPesan] = useState<{ ok?: string; err?: string } | null>(null);

  const hari = useMemo(() => {
    if (!mulai || !selesai || selesai < mulai) return 0;
    const L = new Set(libur); let n = 0;
    for (let d = mulai, i = 0; d <= selesai && i < 400; d = tambah(d, 1), i++) {
      const w = new Date(d + 'T00:00:00Z').getUTCDay();
      if (w > 0 && w < 6 && !L.has(d)) n++;
    }
    return n;
  }, [mulai, selesai, libur]);

  const tahun = mulai ? mulai.slice(0, 4) : hariIni.slice(0, 4);
  const k = kuota[tahun] ?? { jatah: 12, terpakai: 0 };
  const sisa = k.jatah - k.terpakai;
  const sesudah = sisa - (jenis === 'cuti_tahunan' ? hari : 0);
  const butuhSurat = jenis === 'sakit' && hari > 1;
  const haknya = new Date(tanggalMasuk); haknya.setUTCFullYear(haknya.getUTCFullYear() + 1);

  async function kirim(e: React.FormEvent) {
    e.preventDefault(); setPesan(null);
    if (!mulai || !selesai) return setPesan({ err: 'Pilih tanggal mulai dan selesai terlebih dahulu.' });
    if (butuhSurat && !file) return setPesan({ err: 'Sakit lebih dari 1 hari kerja wajib melampirkan surat dokter.' });
    if (file) {
      if (file.size > 2 * 1024 * 1024) return setPesan({ err: 'Ukuran lampiran maksimal 2 MB.' });
      if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) return setPesan({ err: 'Lampiran harus PDF, JPG, atau PNG.' });
    }
    setBusy(true);
    let path: string | null = null;
    if (file) {
      path = `${uid}/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]/g, '_')}`;
      const { error } = await supaBrowser().storage.from('lampiran').upload(path, file, { contentType: file.type });
      if (error) { setBusy(false); return setPesan({ err: 'Gagal mengunggah lampiran: ' + error.message }); }
    }
    const r = await ajukan({ jenis, mulai, selesai, alasan, lampiran: path });
    setBusy(false); setPesan(r);
    if (r.ok) { setRk((x) => x + 1); setMulai(''); setSelesai(''); setAlasan(''); setFile(null); (document.getElementById('lampiran') as HTMLInputElement).value = ''; router.refresh(); }
  }

  return (
    <form onSubmit={kirim} className="card">
      <h2>Ajukan baru</h2>
      {pesan && <div className={'flash ' + (pesan.err ? 'err' : 'ok')}>{pesan.err || pesan.ok}</div>}
      <div className="f"><label>Jenis</label>
        <select value={jenis} onChange={(e) => setJenis(e.target.value)}>
          <option value="cuti_tahunan">Cuti tahunan (paling lambat H-3)</option><option value="izin">Izin (maks. 2 hari kerja, paling lambat H-1)</option><option value="sakit">Sakit (sampai 3 hari setelah mulai sakit)</option>
        </select></div>
      <div className="f"><label>Tanggal cuti: klik tanggal mulai, lalu tanggal selesai</label>
        <PilihTanggal key={rk} mode="rentang" nameDari="mulai" nameSampai="selesai" libur={libur} placeholder="Pilih tanggal mulai dan selesai" onChange={(x, y) => { setMulai(x); setSelesai(y); }} /></div>
      <div style={{ background: 'var(--soft)', borderRadius: 10, padding: 12, marginBottom: 12 }}>
        <div>Jumlah hari kerja: <b>{hari}</b> <span className="muted">(tanpa Sabtu, Minggu, dan hari libur)</span></div>
        {jenis === 'cuti_tahunan' ? (<div>Sisa kuota {tahun}: <b>{sisa}</b> hari → setelah pengajuan: <b style={{ color: sesudah < 0 ? 'var(--red)' : 'var(--green)' }}>{sesudah}</b>
          {sesudah < 0 && <span style={{ color: 'var(--red)' }}> (kuota tidak cukup, akan ditolak)</span>}</div>) : <div className="muted">{jenis === 'sakit' ? 'Sakit' : 'Izin'} tidak mengurangi kuota cuti.</div>}
        {jenis === 'cuti_tahunan' && <div className="muted" style={{ fontSize: 12.5 }}>Hak cuti tahunan mulai {haknya.toISOString().slice(0, 10)} (12 bulan masa kerja).</div>}
      </div>
      <div className="f"><label>Alasan (min. 5 karakter)</label><textarea value={alasan} onChange={(e) => setAlasan(e.target.value)} required minLength={5} /></div>
      <div className="f"><label>Lampiran surat dokter {butuhSurat ? '(wajib)' : '(opsional)'} — PDF/JPG/PNG, maks. 2 MB</label>
        <input id="lampiran" type="file" accept="application/pdf,image/jpeg,image/png" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
      <button disabled={busy}>{busy ? 'Mengirim…' : 'Kirim pengajuan'}</button>
    </form>
  );
}
