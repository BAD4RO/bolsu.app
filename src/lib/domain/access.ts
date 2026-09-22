const protectedRoots = ['/recorrencias','/dashboard','/lancamentos','/contas','/cartoes','/metas','/limites','/assinatura','/perfil','/mais','/notificacoes','/seguranca'];
export const isProtectedPath = (path: string) => protectedRoots.some(root => path === root || path.startsWith(root + '/'));
export const callbackDestination = (next: string | null) => next === '/redefinir-senha' ? next : '/dashboard';
export const isSameOrigin = (requestUrl: string, origin: string | null) => {
  try { return origin !== null && new URL(requestUrl).origin === new URL(origin).origin; } catch { return false; }
};
