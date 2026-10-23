'use client';
export default function Cetak() {
  return <button className="noprint" onClick={() => window.print()}>Cetak / Simpan PDF</button>;
}
