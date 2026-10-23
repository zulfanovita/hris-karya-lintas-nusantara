'use client';
import { useEffect, useRef, useState } from 'react';
import Ikon from './Ikon';
import { namaBulan, tgl } from '@/lib/format';
import './pilihtanggal.css';

type Props = {
  mode: 'tanggal' | 'rentang';
  name?: string; nameDari?: string; nameSampai?: string;
  defaultValue?: string; defaultDari?: string; defaultSampai?: string;
  min?: string; max?: string; libur?: string[];
  preset?: boolean; bulan?: 1 | 2; kosong?: boolean; required?: boolean; placeholder?: string;
  onChange?: (dari: string, sampai: string) => void;
};

const pad = (n: number) => String(n).padStart(2, '0');
const kode = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const hariIni = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);          // WIB
const tambah = (s: string, n: number) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
const jmlHari = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const geserBln = (o: { y: number; m: number }, n: number) => { const t = new Date(Date.UTC(o.y, o.m - 1 + n, 1)); return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1 }; };
const senin = (s: string) => { const [y, m, d] = s.split('-').map(Number); return tambah(s, -((new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7)); };
const HARI = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const SINGKAT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function daftarPreset(t: string): [string, string, string][] {
  const [y, m] = t.split('-').map(Number), q = Math.floor((m - 1) / 3), sn = senin(t);
  const akhir = (yy: number, mm: number) => kode(yy, mm, jmlHari(yy, mm));
  const bl = geserBln({ y, m }, -1);
  const [qy, qq] = q === 0 ? [y - 1, 3] : [y, q - 1];
  return [
    ['Minggu ini', sn, tambah(sn, 6)], ['Bulan ini', kode(y, m, 1), akhir(y, m)],
    ['Kuartal ini', kode(y, q * 3 + 1, 1), akhir(y, q * 3 + 3)], ['Tahun ini', kode(y, 1, 1), kode(y, 12, 31)],
    ['Minggu lalu', tambah(sn, -7), tambah(sn, -1)], ['Bulan lalu', kode(bl.y, bl.m, 1), akhir(bl.y, bl.m)],
    ['Kuartal lalu', kode(qy, qq * 3 + 1, 1), akhir(qy, qq * 3 + 3)], ['Tahun lalu', kode(y - 1, 1, 1), kode(y - 1, 12, 31)],
    ['30 hari terakhir', tambah(t, -29), t], ['90 hari terakhir', tambah(t, -89), t],
  ];
}

export default function PilihTanggal(p: Props) {
  const rentang = p.mode === 'rentang';
  const [nilai, setNilai] = useState({ dari: (rentang ? p.defaultDari : p.defaultValue) ?? '', sampai: (rentang ? p.defaultSampai : p.defaultValue) ?? '' });
  const [buka, setBuka] = useState(false);
  const [a, setA] = useState(''); const [b, setB] = useState(''); const [hover, setHover] = useState('');
  const [tampil, setTampil] = useState({ y: 2026, m: 1 });
  const [lihat, setLihat] = useState<'hari' | 'bulan'>('hari'); const [thn, setThn] = useState(2026);
  const [kanan, setKanan] = useState(false); const [sempit, setSempit] = useState(false);
  const ref = useRef<HTMLDivElement>(null), pop = useRef<HTMLDivElement>(null);
  const t = hariIni(), L = new Set(p.libur ?? []);
  const nBulan = rentang && (p.bulan ?? 1) === 2 && !sempit ? 2 : 1;
  const mati = (d: string) => !!((p.max && d > p.max) || (p.min && d < p.min));

  useEffect(() => {
    if (!buka) { setKanan(false); return; }
    const r = pop.current?.getBoundingClientRect();
    if (r && r.right > window.innerWidth - 8) setKanan(true);
    const klik = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setBuka(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setBuka(false); };
    document.addEventListener('mousedown', klik); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', klik); document.removeEventListener('keydown', esc); };
  }, [buka]);

  function bukaPopup() {
    const [y, m] = (nilai.dari || t).split('-').map(Number);
    setSempit(window.innerWidth < 720);
    setA(nilai.dari); setB(rentang ? nilai.sampai : ''); setHover(''); setTampil({ y, m }); setLihat('hari'); setBuka(true);
  }
  function simpan(x: string, y: string) { setNilai({ dari: x, sampai: y }); p.onChange?.(x, y); setBuka(false); }
  function klik(d: string) {
    if (mati(d)) return;
    if (!rentang) return simpan(d, d);
    if (!a || b) { setA(d); setB(''); } else if (d < a) setA(d); else setB(d);
  }
  function pakai(x: string, y: string) {
    const lo = p.min && x < p.min ? p.min : x, hi = p.max && y > p.max ? p.max : y;
    setA(lo); setB(hi); setHover(''); const [yy, mm] = lo.split('-').map(Number); setTampil({ y: yy, m: mm }); setLihat('hari');
  }

  const lo = a, hi = b || (hover && hover > a ? hover : a);
  const Bulan = ({ ym, awal, akhir }: { ym: { y: number; m: number }; awal: boolean; akhir: boolean }) => {
    const mulai = (new Date(Date.UTC(ym.y, ym.m - 1, 1)).getUTCDay() + 6) % 7, jml = jmlHari(ym.y, ym.m), sel = [];
    for (let i = 0; i < mulai; i++) sel.push(<span key={'k' + i} />);
    for (let d = 1; d <= jml; d++) {
      const s = kode(ym.y, ym.m, d), w = (mulai + d - 1) % 7;
      const dalam = rentang ? !!lo && s >= lo && s <= hi : s === a;
      const kls = ['pt-d', w > 4 ? 'we' : '', L.has(s) ? 'lb' : '', s === t ? 'x' : '', mati(s) ? 'off' : '',
        dalam && (s === lo || (!rentang && s === a)) ? 's' : '', dalam && (s === hi || (!rentang && s === a)) ? 'e' : '', dalam && s !== lo && s !== hi ? 'in' : ''].filter(Boolean).join(' ');
      sel.push(<button type="button" key={d} className={kls} disabled={mati(s)} aria-label={tgl(s)} aria-pressed={dalam} onMouseEnter={() => setHover(s)} onClick={() => klik(s)}>{d}</button>);
    }
    return (
      <div>
        <div className="pt-bh">
          {awal ? <button type="button" className="pt-nav" aria-label="Bulan sebelumnya" onClick={() => setTampil(geserBln(tampil, -1))}><Ikon n="pindah" /></button> : <span className="pt-nav ph" />}
          <button type="button" className="pt-lbl" onClick={() => { setThn(ym.y); setLihat('bulan'); }}>{namaBulan(ym.m - 1)} {ym.y}<span className="pt-car" /></button>
          {akhir ? <button type="button" className="pt-nav" aria-label="Bulan berikutnya" onClick={() => setTampil(geserBln(tampil, 1))}><Ikon n="maju" /></button> : <span className="pt-nav ph" />}
        </div>
        <div className="pt-grid" onMouseLeave={() => setHover('')}>{HARI.map((h) => <b key={h} className="hd">{h}</b>)}{sel}</div>
      </div>
    );
  };

  const label = !nilai.dari ? '' : !rentang || nilai.dari === nilai.sampai ? tgl(nilai.dari) : `${tgl(nilai.dari)} – ${tgl(nilai.sampai)}`;
  const kosongTeks = p.placeholder ?? (rentang ? (p.kosong ? 'Semua tanggal' : 'Pilih rentang tanggal') : 'Pilih tanggal');

  return (
    <div className="pt" ref={ref}>
      {rentang ? <><input type="hidden" name={p.nameDari} value={nilai.dari} /><input type="hidden" name={p.nameSampai} value={nilai.sampai} /></> : <input type="hidden" name={p.name} value={nilai.dari} />}
      {p.required && <input className="pt-req" tabIndex={-1} aria-hidden="true" required value={nilai.dari} onChange={() => {}} />}
      <button type="button" className="pt-btn" aria-haspopup="dialog" aria-expanded={buka} onClick={() => (buka ? setBuka(false) : bukaPopup())}>
        <span className={label ? '' : 'ph'}>{label || kosongTeks}</span><Ikon n="cuti" />
      </button>
      {buka && (
        <div className={'pt-pop' + (kanan ? ' kanan' : '')} ref={pop} role="dialog" aria-label="Pilih tanggal">
          {rentang && p.preset && (
            <ul className="pt-pre"><li className="kl">Rentang cepat</li>
              {daftarPreset(t).map(([l, x, y]) => <li key={l}><button type="button" className={'pt-pb' + (a === x && b === y ? ' on' : '')} onClick={() => pakai(x, y)}>{l}</button></li>)}</ul>
          )}
          <div className="pt-main">
            {lihat === 'bulan' ? (
              <div>
                <div className="pt-thn"><button type="button" className="pt-nav" aria-label="Tahun sebelumnya" onClick={() => setThn(thn - 1)}><Ikon n="pindah" /></button><span>{thn}</span>
                  <button type="button" className="pt-nav" aria-label="Tahun berikutnya" onClick={() => setThn(thn + 1)}><Ikon n="maju" /></button></div>
                <div className="pt-bl">{SINGKAT.map((s, i) => (
                  <button type="button" key={s} className={'pt-m' + (thn === tampil.y && i + 1 === tampil.m ? ' sel' : thn === Number(t.slice(0, 4)) && i + 1 === Number(t.slice(5, 7)) ? ' now' : '')}
                    onClick={() => { setTampil({ y: thn, m: i + 1 }); setLihat('hari'); }}>{s}</button>))}</div>
              </div>
            ) : (
              <div className="pt-bulans"><Bulan ym={tampil} awal akhir={nBulan === 1} />{nBulan === 2 && <Bulan ym={geserBln(tampil, 1)} awal={false} akhir />}</div>
            )}
            {rentang ? (
              <div className="pt-foot"><span className="info">{a ? (b && b !== a ? `${tgl(a)} – ${tgl(b)}` : tgl(a)) : 'Pilih tanggal mulai'}</span>
                <div className="aksi">{p.kosong && <button type="button" className="txt" onClick={() => simpan('', '')}>Hapus</button>}
                  <button type="button" className="txt" onClick={() => setBuka(false)}>Batal</button><button type="button" disabled={!a} onClick={() => simpan(a, b || a)}>Pilih</button></div></div>
            ) : (
              <div className="pt-foot"><div className="aksi">{p.kosong && <button type="button" className="txt" onClick={() => simpan('', '')}>Hapus</button>}
                <button type="button" className="txt" onClick={() => { if (!mati(t)) simpan(t, t); }}>Hari ini</button></div></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
