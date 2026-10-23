import { NextResponse, type NextRequest } from 'next/server';
import { supa } from '@/lib/supabase/server';

// Lampiran bersifat privat: dibuka lewat tautan sementara (60 detik). Hak akses dicek oleh policy Storage
// (pemohon, Atasan divisinya, dan HRD saja).
export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get('path') ?? '';
  const sb = await supa();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return new NextResponse('Tidak diizinkan', { status: 401 });
  const { data, error } = await sb.storage.from('lampiran').createSignedUrl(path, 60);
  if (error || !data) return new NextResponse('Lampiran tidak ditemukan atau Anda tidak berhak membukanya', { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
