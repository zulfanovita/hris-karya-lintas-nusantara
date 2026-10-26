'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
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
  const [menuJenisBuka, setMenuJenisBuka] = useState(false);
  const jenisRef = useRef<HTMLDivElement>(null);
  const tombolJenisRef = useRef<HTMLButtonElement>(null);
  const [mulai, setMulai] = useState(''); const [selesai, setSelesai] = useState('');
  const [alasan, setAlasan] = useState(''); const [file, setFile] = useState<File | null>(null);
  const [fileDiseret, setFileDiseret] = useState(false);
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
  const pilihanJenis = [
    { value: 'cuti_tahunan', label: 'Cuti tahunan (paling lambat H-3)' },
    { value: 'izin', label: 'Izin (maks. 2 hari kerja, paling lambat H-1)' },
    { value: 'sakit', label: 'Sakit (sampai 3 hari setelah mulai sakit)' },
  ];

  useEffect(() => {
    if (!menuJenisBuka) return;
    const tutupSaatKlikLuar = (event: MouseEvent) => {
      if (!jenisRef.current?.contains(event.target as Node)) setMenuJenisBuka(false);
    };
    document.addEventListener('mousedown', tutupSaatKlikLuar);
    return () => document.removeEventListener('mousedown', tutupSaatKlikLuar);
  }, [menuJenisBuka]);

  useEffect(() => {
    if (!menuJenisBuka) return;
    jenisRef.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
  }, [menuJenisBuka]);

  function navigasiMenuJenis(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'Escape') {
      setMenuJenisBuka(false);
      tombolJenisRef.current?.focus();
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const pilihan = jenisRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]');
    if (!pilihan?.length) return;
    const indeks = Array.from(pilihan).indexOf(event.currentTarget);
    const tujuan = event.key === 'Home' ? 0
      : event.key === 'End' ? pilihan.length - 1
        : (indeks + (event.key === 'ArrowDown' ? 1 : -1) + pilihan.length) % pilihan.length;
    pilihan[tujuan].focus();
  }

  function pilihJenis(value: string) {
    setJenis(value);
    setMenuJenisBuka(false);
    tombolJenisRef.current?.focus();
  }

  function terimaFile(fileTerpilih: File | undefined) {
    if (fileTerpilih) setFile(fileTerpilih);
  }

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
      {pesan && <div key={rk} className={`flash ${pesan.err ? 'err' : 'ok'}${pesan.ok ? ' flash-auto-hilang' : ''}`}>{pesan.err || pesan.ok}</div>}
      <div className="f"><label id="jenis-cuti-label">Jenis</label>
        <div className="cuti-dropdown" ref={jenisRef}>
          <button
            ref={tombolJenisRef}
            type="button"
            className="cuti-dropdown-trigger"
            aria-labelledby="jenis-cuti-label"
            aria-haspopup="menu"
            aria-expanded={menuJenisBuka}
            aria-controls="menu-jenis-cuti"
            onClick={() => setMenuJenisBuka((buka) => !buka)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                setMenuJenisBuka(true);
              } else if (event.key === 'Escape') {
                setMenuJenisBuka(false);
              }
            }}
          >
            <span>{pilihanJenis.find((pilihan) => pilihan.value === jenis)?.label}</span>
            <span className="cuti-dropdown-chevron" aria-hidden="true" />
          </button>
          {menuJenisBuka && (
            <div id="menu-jenis-cuti" className="cuti-dropdown-menu" role="menu" aria-labelledby="jenis-cuti-label">
              {pilihanJenis.map((pilihan) => (
                <button
                  key={pilihan.value}
                  type="button"
                  className="cuti-dropdown-option"
                  role="menuitemradio"
                  aria-checked={jenis === pilihan.value}
                  onClick={() => pilihJenis(pilihan.value)}
                  onKeyDown={navigasiMenuJenis}
                >
                  <span>{pilihan.label}</span>
                  {jenis === pilihan.value && <span className="cuti-dropdown-check" aria-hidden="true">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="f"><label>Tanggal cuti: klik tanggal mulai, lalu tanggal selesai</label>
        <div className="cuti-date-picker">
          <PilihTanggal key={rk} mode="rentang" nameDari="mulai" nameSampai="selesai" libur={libur} placeholder="Pilih tanggal mulai dan selesai" onChange={(x, y) => { setMulai(x); setSelesai(y); }} />
        </div></div>
      <div className="cuti-summary">
        <div className="cuti-summary-row">Jumlah hari kerja: <b>{hari}</b> <span className="muted">(tanpa Sabtu, Minggu, dan hari libur)</span></div>
        {jenis === 'cuti_tahunan' ? (<div className="cuti-summary-row">Sisa kuota {tahun}: <b>{sisa}</b> hari → setelah pengajuan: <b style={{ color: sesudah < 0 ? 'var(--red)' : 'var(--green)' }}>{sesudah}</b>
          {sesudah < 0 && <span style={{ color: 'var(--red)' }}> (kuota tidak cukup, akan ditolak)</span>}</div>) : <div className="muted">{jenis === 'sakit' ? 'Sakit' : 'Izin'} tidak mengurangi kuota cuti.</div>}
        {jenis === 'cuti_tahunan' && <div className="cuti-summary-row muted">Hak cuti tahunan mulai {haknya.toISOString().slice(0, 10)} (12 bulan masa kerja).</div>}
      </div>
      <div className="f"><label htmlFor="alasan-cuti">Alasan (min. 5 karakter)</label><textarea id="alasan-cuti" className="alasan-cuti" placeholder="Tuliskan alasan pengajuan cuti..." value={alasan} onChange={(e) => setAlasan(e.target.value)} required minLength={5} /></div>
      <div className="f">
        <label>Lampiran surat dokter {butuhSurat ? '(wajib)' : '(opsional)'}</label>
        <label
          htmlFor="lampiran"
          className={`lampiran-dropzone${fileDiseret ? ' is-dragging' : ''}${file ? ' has-file' : ''}`}
          onDragEnter={(event) => { event.preventDefault(); setFileDiseret(true); }}
          onDragOver={(event) => { event.preventDefault(); setFileDiseret(true); }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFileDiseret(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setFileDiseret(false);
            terimaFile(event.dataTransfer.files[0]);
          }}
        >
          <input
            id="lampiran"
            className="lampiran-input"
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            onChange={(event) => terimaFile(event.target.files?.[0])}
          />
          <span className="lampiran-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M3.75 6.75A1.75 1.75 0 0 1 5.5 5h4l2 2h7A1.75 1.75 0 0 1 20.25 8.75v9.5A1.75 1.75 0 0 1 18.5 20h-13a1.75 1.75 0 0 1-1.75-1.75z" />
              <path d="M4 9h16" />
            </svg>
          </span>
          {file ? (
            <span className="lampiran-copy">
              <span className="lampiran-title">{file.name}</span>
              <span className="lampiran-hint">{(file.size / (1024 * 1024)).toFixed(2)} MB · Klik atau seret file lain untuk mengganti</span>
            </span>
          ) : (
            <span className="lampiran-copy">
              <span className="lampiran-title">Seret file ke sini atau <span className="lampiran-link">klik untuk mengunggah</span></span>
              <span className="lampiran-hint">PDF, JPG, atau PNG · Maks. 2 MB</span>
            </span>
          )}
        </label>
      </div>
      <button disabled={busy}>{busy ? 'Mengirim…' : 'Kirim pengajuan'}</button>
    </form>
  );
}
