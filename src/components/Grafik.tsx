'use client';
import { Bar, BarChart, CartesianGrid, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const sembunyi0 = (v: any) => (v > 0 ? v : '');

export function GrafikMingguan({ data }: { data: any[] }) {
  const seri = [['tepat_waktu', 'Hadir tepat waktu', '#15803d'], ['terlambat', 'Terlambat', '#d97706'], ['cuti_izin', 'Cuti, sakit, izin', '#2563eb'], ['tanpa_keterangan', 'Tanpa keterangan', '#dc2626']];
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" fontSize={12} /><YAxis fontSize={12} allowDecimals={false} />
        <Tooltip /><Legend wrapperStyle={{ fontSize: 12 }} />
        {seri.map(([k, n, c]) => (
          <Bar key={k} dataKey={k} name={n} stackId="a" fill={c}>
            <LabelList dataKey={k} position="center" className="lbl-bar" fontSize={11} formatter={sembunyi0} />
          </Bar>))}
      </BarChart>
    </ResponsiveContainer>
  );
}

// Batang per divisi, satu batang untuk tiap bulan (grouped)
export function GrafikCuti({ data, seri }: { data: any[]; seri: string[] }) {
  const warna = ['#a5bfff', '#6c9bff', '#2f6bff'];
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 16, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="divisi" fontSize={12} /><YAxis fontSize={12} allowDecimals={false} />
        <Tooltip /><Legend wrapperStyle={{ fontSize: 12 }} />
        {seri.map((s, i) => (
          <Bar key={s} dataKey={s} fill={warna[i % 3]} radius={[4, 4, 0, 0]}>
            <LabelList dataKey={s} position="top" className="lbl-top" fontSize={11} />
          </Bar>))}
      </BarChart>
    </ResponsiveContainer>
  );
}
