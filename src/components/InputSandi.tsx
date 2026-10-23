'use client';
import { useState } from 'react';
import './inputsandi.css';

// Kolom kata sandi dengan tombol mata untuk menampilkan / menyembunyikan isinya.
export default function InputSandi({ id, name, autoComplete = 'current-password' }: { id: string; name: string; autoComplete?: string }) {
  const [lihat, setLihat] = useState(false);
  return (
    <div className="ps">
      <input id={id} name={name} type={lihat ? 'text' : 'password'} required autoComplete={autoComplete} />
      <button type="button" className="ps-mata" aria-label={lihat ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'} aria-pressed={lihat}
        title={lihat ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'} onMouseDown={(e) => e.preventDefault()} onClick={() => setLihat(!lihat)}>
        {lihat ? (
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.9 17.9A10.1 10.1 0 0 1 12 20C5 20 1 12 1 12a18.5 18.5 0 0 1 5.1-5.9M9.9 4.2A9.1 9.1 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.2 3.2M14.1 14.1a3 3 0 1 1-4.2-4.2M1 1l22 22" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" /><circle cx="12" cy="12" r="3" /></svg>
        )}
      </button>
    </div>
  );
}
