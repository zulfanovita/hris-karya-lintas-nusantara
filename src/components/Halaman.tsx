import Link from 'next/link';
import { PER_HALAMAN } from '@/lib/halaman';
import './halaman.css';

// Navigasi halaman. Filter lain di alamat (q, divisi, bulan, dst.) dipertahankan; pesan ok/err tidak ikut.
export default function Halaman({ hal, total, path, sp, per = PER_HALAMAN }: { hal: number; total: number; path: string; sp: Record<string, string | undefined>; per?: number }) {
  const jml = Math.max(1, Math.ceil(total / per));
  const href = (h: number) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (v && !['hal', 'ok', 'err'].includes(k)) u.set(k, v);
    if (h > 1) u.set('hal', String(h));
    const s = u.toString();
    return s ? `${path}?${s}` : path;
  };
  if (total === 0 && hal > 1)
    return <div className="pg"><span className="info">Halaman tidak ditemukan.</span><Link className="btn sec sm" href={href(1)}>Ke halaman 1</Link></div>;
  if (total <= per) return null;                                       // satu halaman saja: tidak perlu navigasi

  const dari = (hal - 1) * per + 1, sampai = Math.min(hal * per, total);
  const nomor: number[] = [];
  for (let i = Math.max(1, hal - 2); i <= Math.min(jml, hal + 2); i++) nomor.push(i);
  const awal = nomor[0], akhir = nomor[nomor.length - 1];
  return (
    <nav className="pg" aria-label="Navigasi halaman">
      <span className="info">Menampilkan {dari}–{sampai} dari {total} data</span>
      <div className="nav">
        {hal > 1 ? <Link className="pg-b" href={href(hal - 1)} aria-label="Halaman sebelumnya">‹</Link> : <span className="pg-b off">‹</span>}
        {awal > 1 && <><Link className="pg-b" href={href(1)}>1</Link>{awal > 2 && <span className="pg-e">…</span>}</>}
        {nomor.map((n) => (n === hal ? <span key={n} className="pg-b on" aria-current="page">{n}</span> : <Link key={n} className="pg-b" href={href(n)}>{n}</Link>))}
        {akhir < jml && <>{akhir < jml - 1 && <span className="pg-e">…</span>}<Link className="pg-b" href={href(jml)}>{jml}</Link></>}
        {hal < jml ? <Link className="pg-b" href={href(hal + 1)} aria-label="Halaman berikutnya">›</Link> : <span className="pg-b off">›</span>}
      </div>
    </nav>
  );
}