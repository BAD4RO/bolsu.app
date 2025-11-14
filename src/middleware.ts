import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Rotas protegidas que requerem autenticação
  const protectedRoutes = ['/dashboard', '/lancamentos', '/assinatura', '/perfil', '/mais'];
  const isProtectedRoute = protectedRoutes.some(route => req.nextUrl.pathname.startsWith(route));

  // Se a rota é protegida e não há sessão, redirecionar para login
  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Se está na página inicial e já tem sessão, redirecionar para dashboard
  if (req.nextUrl.pathname === '/' && session) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/lancamentos/:path*', '/assinatura/:path*', '/perfil/:path*', '/mais/:path*'],
};
