'use client';
import { useEffect, useRef, useState } from 'react';
import Ikon from './Ikon';
import { namaBulan } from '@/lib/format';
import './pilihbulan.css';

const SINGKAT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

// Pengganti <input type="month">. Mengirim nilai "YYYY-MM" lewat input tersembunyi bernama `name`.
export default function PilihBulan({ id, name, defaultValue }: { id: string; name: string; defaultValue: string }) {
  const [val, setVal] = useState(defaultValue);
  const [buka, setBuka] = useState(false);
  const [tahun, setTahun] = useState(Number(defaultValue.slice(0, 4)));
  const ref = useRef<HTMLDivElement>(null);
  const sekarang = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 7);       // bulan ini (WIB)

  useEffect(() => {
    if (!buka) return;
    const klik = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setBuka(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setBuka(false); };
    document.addEventListener('mousedown', klik); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', klik); document.removeEventListener('keydown', esc); };
  }, [buka]);

  const pilih = (m: number) => { setVal(`${tahun}-${String(m + 1).padStart(2, '0')}`); setBuka(false); };
  const label = `${namaBulan(Number(val.slice(5, 7)) - 1)} ${val.slice(0, 4)}`;

  return (
    <div className="pb" ref={ref}>
      <input type="hidden" name={name} value={val} />
      <button id={id} type="button" className="pb-btn" aria-haspopup="dialog" aria-expanded={buka} onClick={() => { setTahun(Number(val.slice(0, 4))); setBuka(!buka); }}>
        <span>{label}</span><Ikon n="cuti" />
      </button>
      {buka && (
        <div className="pb-pop" role="dialog" aria-label="Pilih bulan">
          <div className="pb-thn">
            <button type="button" className="pb-nav" aria-label="Tahun sebelumnya" onClick={() => setTahun(tahun - 1)}><Ikon n="pindah" /></button>
            <span>{tahun}</span>
            <button type="button" className="pb-nav" aria-label="Tahun berikutnya" onClick={() => setTahun(tahun + 1)}><Ikon n="maju" /></button>
          </div>
          <div className="pb-grid">
            {SINGKAT.map((s, i) => {
              const kode = `${tahun}-${String(i + 1).padStart(2, '0')}`;
              return <button type="button" key={s} className={'pb-m' + (kode === val ? ' sel' : kode === sekarang ? ' now' : '')} onClick={() => pilih(i)}>{s}</button>;
            })}
          </div>
          <div className="pb-foot">
            <button type="button" onClick={() => { setVal(sekarang); setBuka(false); }}>Bulan ini</button>
          </div>
        </div>
      )}
    </div>
  );
}
