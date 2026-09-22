import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isProtectedPath } from '@/lib/domain/access';

export async function middleware(req: NextRequest) {
  let response = NextResponse.next({ request: req });
  response.headers.set('Cache-Control', 'private, no-store');
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (values) => {
        values.forEach(({ name, value }) => req.cookies.set(name, value));
        response = NextResponse.next({ request: req });
        response.headers.set('Cache-Control', 'private, no-store');
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    } },
  );
  let authenticated = false;
  try { const { data, error } = await supabase.auth.getUser(); authenticated = !error && !!data.user; } catch { /* Fail closed. */ }
  const pathname = req.nextUrl.pathname;
  let destination: URL | null = null;
  if (!authenticated && isProtectedPath(pathname)) destination = new URL('/login', req.url);
  if (authenticated && ['/', '/login', '/cadastro'].includes(pathname)) destination = new URL('/dashboard', req.url);
  if (destination) {
    const redirect = NextResponse.redirect(destination);
    response.cookies.getAll().forEach(cookie => redirect.cookies.set(cookie));
    redirect.headers.set('Cache-Control', 'private, no-store');
    return redirect;
  }
  return response;
}
export const config = {
  matcher: ['/recorrencias/:path*', '/', '/login', '/cadastro', '/dashboard/:path*', '/lancamentos/:path*', '/contas/:path*',
    '/cartoes/:path*', '/metas/:path*', '/limites/:path*', '/assinatura/:path*', '/perfil/:path*',
    '/mais/:path*', '/notificacoes/:path*', '/seguranca/:path*'],
};
