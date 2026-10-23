import { masuk } from '../actions';
import { Flash, type SP } from '@/components/ui';
import TemaToggle from '@/components/TemaToggle';
import InputSandi from '@/components/InputSandi';

export default async function Masuk({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  return (
    <main className="login">
      <div className="tg"><TemaToggle /></div>
      <div className="box">
        <h1 style={{ color: 'var(--brand)' }}>HRIS Karsa</h1>
        <p className="sub" style={{ marginBottom: 20 }}>PT Karsa Lintas Nusantara · Masuk dengan akun perusahaan</p>
        <Flash err={sp.err} ok={sp.ok} />
        <form action={masuk}>
          <div className="f"><label htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="username" placeholder="nama@karsalintas.test" /></div>
          <div className="f"><label htmlFor="password">Kata sandi</label><InputSandi id="password" name="password" /></div>
          <button style={{ width: '100%' }}>Masuk</button>
        </form>
        <p className="muted" style={{ fontSize: 12.5, marginTop: 16 }}>Tidak ada pendaftaran mandiri. Akun dibuat oleh HRD.</p>
      </div>
    </main>
  );
}
