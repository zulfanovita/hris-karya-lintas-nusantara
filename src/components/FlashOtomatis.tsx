export default function FlashOtomatis({ ok, err }: { ok?: string; err?: string }) {
  if (!ok && !err) return null;
  return <div className={`flash ${err ? 'err' : 'ok'}${ok && !err ? ' flash-auto-hilang' : ''}`} role="status">{err || ok}</div>;
}
