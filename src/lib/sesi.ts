import { cache } from 'react';
import { redirect } from 'next/navigation';
import { supa } from './supabase/server';

export type Profil = {
  id: string; nik_karyawan: string; nama_lengkap: string; email: string; nomor_hp: string | null;
  peran: 'karyawan' | 'atasan' | 'hrd'; divisi_id: string | null; jabatan: string;
  status_kerja: string; tanggal_masuk: string; aktif: boolean;
};

// Satu kali per permintaan. Akun nonaktif langsung dikeluarkan.
export const getSesi = cache(async () => {
  const sb = await supa();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/masuk');
  const { data: profil } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (!profil || !profil.aktif) {
    await sb.auth.signOut();
    redirect('/masuk?err=' + encodeURIComponent('Akun Anda nonaktif atau belum terdaftar. Hubungi HRD.'));
  }
  return { sb, user, profil: profil as Profil };
});

export function wajibPeran(profil: Profil, ...peran: Profil['peran'][]) {
  if (!peran.includes(profil.peran)) redirect('/dashboard?err=' + encodeURIComponent('Anda tidak memiliki akses ke halaman itu'));
}
