import { LABEL_STATUS } from '@/lib/format';

export function Flash({ ok, err }: { ok?: string; err?: string }) {
  if (!ok && !err) return null;
  return <div className={'flash ' + (err ? 'err' : 'ok')} role="status">{err || ok}</div>;
}
export function Badge({ s, teks }: { s: string; teks?: string }) {
  return <span className={'badge b-' + s}>{teks ?? LABEL_STATUS[s] ?? s}</span>;
}
export function Stat({ n, l, warna }: { n: React.ReactNode; l: string; warna?: string }) {
  return <div className="stat"><div className="n" style={warna ? { color: warna } : undefined}>{n}</div><div className="l">{l}</div></div>;
}
export type SP = Promise<Record<string, string | undefined>>;
export function StatK({ n, l, warna }: { n: React.ReactNode; l: string; warna?: string }) {
  return <div className="stat"><div className="kl">{l}</div><div className="n" style={warna ? { color: warna } : undefined}>{n}</div></div>;
}
