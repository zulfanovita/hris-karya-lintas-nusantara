import Link from 'next/link';
import Ikon from './Ikon';
import { namaBulan } from '@/lib/format';

export default function Kalender({ tahun, bulan, hari, libur, cuti }: { tahun: number; bulan: number; hari: string; libur: Record<string, string>; cuti: Set<string> }) {
  const awal = (new Date(Date.UTC(tahun, bulan - 1, 1)).getUTCDay() + 6) % 7;      // Senin = 0
  const jml = new Date(Date.UTC(tahun, bulan, 0)).getUTCDate();
  const geser = (d: number) => { const t = new Date(Date.UTC(tahun, bulan - 1 + d, 1)); return `/dashboard?bln=${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}`; };
  const sel = [];
  for (let i = 0; i < awal; i++) sel.push(<span key={'k' + i} />);
  for (let d = 1; d <= jml; d++) {
    const tg = `${tahun}-${String(bulan).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const w = (awal + d - 1) % 7;
    const kelas = tg === hari ? 'td' : libur[tg] ? 'lb' : cuti.has(tg) ? 'cu' : w > 4 ? 'we' : '';
    sel.push(<span key={d} className={kelas} title={libur[tg] ?? (cuti.has(tg) ? 'Cuti/izin/sakit Anda' : undefined)}>{d}</span>);
  }
  return (
    <div className="card cal">
      <h3><Link href={geser(-1)} aria-label="Bulan sebelumnya"><Ikon n="pindah" /></Link>{namaBulan(bulan - 1)} {tahun}<Link href={geser(1)} aria-label="Bulan berikutnya"><Ikon n="maju" /></Link></h3>
      <div className="g">{['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((h) => <b key={h}>{h}</b>)}{sel}</div>
      <div className="lg"><span><i style={{ background: 'var(--btn)' }} />Hari ini</span><span><i style={{ background: 'var(--red)' }} />Libur</span><span><i style={{ background: 'var(--blue)' }} />Cuti saya</span></div>
    </div>
  );
}
