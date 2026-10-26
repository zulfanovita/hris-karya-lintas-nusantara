'use client';
import { Bar, BarChart, CartesianGrid, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const sembunyi0 = (v: any) => (v > 0 ? v : '');

function batangBertumpuk(dataKey: string, data: any[], props: any) {
  const { x, y, width, height, fill, payload } = props;
  const first = data.findIndex(([key]) => Number(payload[key]) > 0);
  const last = data.findLastIndex(([key]) => Number(payload[key]) > 0);
  const index = data.findIndex(([key]) => key === dataKey);
  const radius = Math.min(7, width / 2, height / 2);
  const roundTop = index === last;
  const roundBottom = index === first;
  const path = [
    `M${x + (roundTop ? radius : 0)},${y}`,
    `H${x + width - (roundTop ? radius : 0)}`,
    roundTop ? `Q${x + width},${y} ${x + width},${y + radius}` : `L${x + width},${y}`,
    `V${y + height - (roundBottom ? radius : 0)}`,
    roundBottom ? `Q${x + width},${y + height} ${x + width - radius},${y + height}` : `L${x + width},${y + height}`,
    `H${x + (roundBottom ? radius : 0)}`,
    roundBottom ? `Q${x},${y + height} ${x},${y + height - radius}` : `L${x},${y + height}`,
    `V${y + (roundTop ? radius : 0)}`,
    roundTop ? `Q${x},${y} ${x + radius},${y}` : `L${x},${y}`,
    'Z',
  ].join(' ');

  return <path d={path} fill={fill} />;
}

export function GrafikMingguan({ data, dashboard = false }: { data: any[]; dashboard?: boolean }) {
  const seri = [['tepat_waktu', 'Hadir tepat waktu', '#15803d'], ['terlambat', 'Terlambat', '#d97706'], ['cuti_izin', 'Cuti, sakit, izin', '#2563eb'], ['tanpa_keterangan', 'Tanpa keterangan', '#dc2626']];
  return (
    <ResponsiveContainer width="100%" height={dashboard ? 310 : 280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barCategoryGap={dashboard ? '22%' : undefined}>
        <CartesianGrid stroke={dashboard ? 'var(--line)' : undefined} strokeDasharray={dashboard ? '4 5' : '3 3'} vertical={false} />
        <XAxis dataKey="label" fontSize={dashboard ? undefined : 12}
          tick={dashboard ? { fill: 'var(--muted)', fontSize: 12 } : undefined}
          axisLine={dashboard ? { stroke: 'var(--line)' } : undefined} tickLine={dashboard ? false : undefined} />
        <YAxis fontSize={dashboard ? undefined : 12}
          tick={dashboard ? { fill: 'var(--muted)', fontSize: 12 } : undefined}
          axisLine={dashboard ? false : undefined} tickLine={dashboard ? false : undefined}
          allowDecimals={false} width={dashboard ? 42 : undefined} />
        <Tooltip
          cursor={dashboard ? { fill: 'var(--soft)' } : undefined}
          contentStyle={dashboard ? { backgroundColor: 'var(--card)', borderColor: 'var(--line)', borderRadius: 12, color: 'var(--ink)' } : undefined}
          itemStyle={dashboard ? { color: 'var(--ink)' } : undefined}
          labelStyle={dashboard ? { color: 'var(--muted)', fontWeight: 600 } : undefined}
        />
        <Legend iconType={dashboard ? 'rect' : undefined} wrapperStyle={dashboard ? { fontSize: 12, paddingTop: 8 } : { fontSize: 12 }} />
        {seri.map(([k, n, c]) => (
          <Bar key={k} dataKey={k} name={n} stackId="a" fill={c}
            maxBarSize={dashboard ? 72 : undefined}
            shape={dashboard ? (props: any) => batangBertumpuk(k, seri, props) : undefined}>
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
