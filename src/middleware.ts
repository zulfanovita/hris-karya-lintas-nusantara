import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Menyegarkan sesi dan mengarahkan pengunjung yang belum masuk ke halaman Masuk.
export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const sb = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll(list) {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await sb.auth.getUser();
  const publik = req.nextUrl.pathname === '/masuk';
  if (!user && !publik) {
    const u = req.nextUrl.clone(); u.pathname = '/masuk'; u.search = '';
    return NextResponse.redirect(u);
  }
  if (user && publik) {
    const u = req.nextUrl.clone(); u.pathname = '/dashboard'; u.search = '';
    return NextResponse.redirect(u);
  }
  return res;
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt).*)'] };
