// Notifikasi email (nilai tambah, PRD 11). Kegagalan kirim TIDAK boleh membatalkan aksi utama.
export async function kirimEmail(to: string[], subject: string, isi: string) {
  const key = process.env.RESEND_API_KEY;
  const penerima = [...new Set(to.filter(Boolean))];
  if (!key || penerima.length === 0) return;
  const url = process.env.NEXT_PUBLIC_APP_URL || '';
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1f2937">
    <h3 style="color:#0f766e;margin-bottom:4px">HRIS PT Karsa Lintas Nusantara</h3>
    <p style="line-height:1.6">${isi}</p>
    ${url ? `<p><a href="${url}" style="background:#0f766e;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Buka aplikasi</a></p>` : ''}
    <p style="color:#6b7280;font-size:12px">Email otomatis. Jangan membalas email ini.</p></div>`;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.EMAIL_FROM || 'HRIS Karsa <onboarding@resend.dev>', to: penerima, subject, html }),
      signal: AbortSignal.timeout(4000),
    });
  } catch (e) {
    console.error('Gagal kirim email (diabaikan):', e);
  }
}
