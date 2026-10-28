import Link from 'next/link';
import PilihTanggal from '@/components/PilihTanggal';
import { getSesi, wajibPeran } from '@/lib/sesi';
import { buatKaryawan } from '../../../actions';
import { Flash, type SP } from '@/components/ui';
import { hariIniWIB } from '@/lib/format';

export default async function Baru({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const { sb, profil } = await getSesi(); wajibPeran(profil, 'hrd');
  const { data: divisi } = await sb.from('divisi').select('id,nama').order('nama');
  return (
    <>
      <div className="top"><div className="employee-heading"><Link href="/karyawan" className="back-button" aria-label="Kembali ke daftar karyawan" title="Kembali ke daftar karyawan"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m0 0 7-7m-7 7 7 7" /></svg></Link><div><h1>Tambah karyawan</h1><p className="sub">HRD membuat akun; tidak ada pendaftaran mandiri.</p></div></div></div>
      <Flash ok={sp.ok} err={sp.err} />
      <form action={buatKaryawan} className="card" style={{ maxWidth: 640 }}>
        <div className="row f"><div><label>Nama lengkap</label><input name="nama_lengkap" required minLength={3} /></div><div><label>NIK (kosong = otomatis)</label><input name="nik_karyawan" placeholder="KLN-0020" pattern="KLN-[0-9]{4}" /></div></div>
        <div className="row f"><div><label>Email (untuk masuk)</label><input type="email" name="email" required /></div><div><label>Kata sandi awal (min. 8)</label><input type="text" name="password" required minLength={8} /></div></div>
        <div className="row f"><div><label>Jabatan</label><input name="jabatan" required /></div><div><label>Nomor HP</label><input name="nomor_hp" /></div></div>
        <div className="row f"><div><label>Divisi</label><select name="divisi_id" required>{(divisi ?? []).map((d) => <option key={d.id} value={d.id}>{d.nama}</option>)}</select></div>
          <div><label>Peran</label><select name="peran"><option value="karyawan">Karyawan</option><option value="atasan">Atasan</option><option value="hrd">HRD</option></select></div></div>
        <div className="row f"><div><label>Status kerja</label><select name="status_kerja"><option value="tetap">Tetap</option><option value="kontrak">Kontrak</option></select></div>
          <div><label>Tanggal masuk</label><PilihTanggal mode="tanggal" name="tanggal_masuk" defaultValue={hariIniWIB()} required /></div></div>
        <button>Buat akun karyawan</button>
      </form>
    </>
  );
}
