export const PER_HALAMAN = 10;                    // ubah angka ini untuk mengganti jumlah baris per halaman di SEMUA daftar

export const bacaHalaman = (sp: Record<string, string | undefined>) => Math.max(1, parseInt(sp.hal ?? '1', 10) || 1);

// Pagination di DATABASE: hanya baris halaman itu yang dikirim. Query harus memakai select(..., { count: 'exact' }).
export async function ambilHalaman(q: any, hal: number, per = PER_HALAMAN) {
  const r = await q.range((hal - 1) * per, hal * per - 1);
  if (r.error?.code === 'PGRST103') return { data: [] as any[], total: 0 };      // nomor halaman melewati jumlah data
  return { data: (r.data ?? []) as any[], total: (r.count ?? 0) as number };
}

// Pagination di MEMORI: untuk data yang sudah diambil lengkap (dibutuhkan untuk kartu ringkasan / filter).
export function potong<T>(arr: T[], hal: number, per = PER_HALAMAN) {
  const maks = Math.max(1, Math.ceil(arr.length / per)), h = Math.min(hal, maks);
  return { data: arr.slice((h - 1) * per, h * per), total: arr.length, hal: h };
}