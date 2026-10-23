import { getSesi } from '@/lib/sesi';
import { keluar } from '../actions';
import { inisial, LABEL_PERAN } from '@/lib/format';
import Ikon from '@/components/Ikon';
import TemaToggle from '@/components/TemaToggle';
import Nav from './Nav';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { sb, profil } = await getSesi();
  const p = profil.peran;
  // lencana jumlah antrean di menu Persetujuan (Atasan: tahap 1, HRD: keputusan akhir)
  let antre = 0;
  if (p === 'atasan') {
    const r = await sb.from('pengajuan_cuti').select('id', { count: 'exact', head: true }).eq('status', 'diajukan').eq('perlu_atasan', true).neq('karyawan_id', profil.id);
    antre = r.count ?? 0;
  } else if (p === 'hrd') {
    const r = await sb.from('pengajuan_cuti').select('id', { count: 'exact', head: true }).or('status.eq.disetujui_atasan,and(status.eq.diajukan,perlu_atasan.eq.false)').neq('karyawan_id', profil.id);
    antre = r.count ?? 0;
  }
  const menu = [
    { href: '/dashboard', t: 'Dashboard', i: 'dashboard' },
    { href: '/absensi', t: 'Absensi', i: 'absensi' },
    { href: '/cuti', t: 'Cuti dan Izin', i: 'cuti' },
    ...(p !== 'karyawan' ? [{ href: '/persetujuan', t: 'Persetujuan', i: 'persetujuan', badge: antre }, { href: '/karyawan', t: 'Data Karyawan', i: 'karyawan' }] : []),
    { href: '/slip', t: 'Slip Gaji', i: 'slip' },
    ...(p === 'hrd' ? [{ href: '/laporan', t: 'Laporan', i: 'laporan' }, { href: '/pengaturan', t: 'Pengaturan', i: 'pengaturan' }] : []),
  ];
  return (
    <div className="frame">
      <aside className="side">
        <div className="logo"><i>K</i><div>Karsa<b>HR</b><small>PT Karsa Lintas Nusantara</small></div></div>
        <Nav menu={menu} />
        <form action={keluar} className="out"><button><Ikon n="keluar" /><span>Keluar</span></button></form>
      </aside>
      <div className="content">
        <header className="topbar">
          {p !== 'karyawan' ? (
            <form action="/karyawan" method="get" className="search"><Ikon n="cari" /><input name="q" placeholder="Cari karyawan (nama, NIK, email)…" aria-label="Cari karyawan" /></form>
          ) : <div className="sp" />}
          <div className="sp" />
          <TemaToggle />
          <div className="chip"><div>{profil.nama_lengkap}<small>{LABEL_PERAN[p]} · {profil.jabatan}</small></div><span className="av">{inisial(profil.nama_lengkap)}</span></div>
        </header>
        <main className="main">{children}</main>
      </div>
    </div>
  );
}
