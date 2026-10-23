'use client';
import Ikon from './Ikon';

// Mode terang/gelap. Pilihan disimpan di localStorage; tanpa pilihan, mengikuti pengaturan perangkat.
export default function TemaToggle() {
  function ganti() {
    const gelap = document.documentElement.dataset.theme === 'dark';
    const baru = gelap ? 'light' : 'dark';
    document.documentElement.dataset.theme = baru;
    try { localStorage.setItem('tema', baru); } catch { /* diabaikan */ }
  }
  return (
    <button type="button" className="ibtn" onClick={ganti} aria-label="Ganti mode terang atau gelap" title="Terang / Gelap">
      <Ikon n="moon" className="sun" /><Ikon n="sun" className="moon" />
    </button>
  );
}
