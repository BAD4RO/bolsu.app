import { supabase } from './supabase';
import { signupSchema } from './domain/validation';
export interface RegisterData { nome: string; email: string; password: string }
export interface LoginData { email: string; password: string }
export interface AuthError { message: string }
const connectionMessage = 'Não foi possível conectar. Confira sua conexão e tente novamente.';
export async function signUp(data: RegisterData) {
  const parsed = signupSchema.safeParse(data);
  if (!parsed.success) return { data: null, error: { message: parsed.error.issues[0].message } };
  try {
    const { nome, email, password } = parsed.data;
    return await supabase.auth.signUp({ email, password, options: {
      data: { nome }, emailRedirectTo: `${window.location.origin}/auth/callback`,
    } });
  } catch { return { data: null, error: { message: connectionMessage } }; }
}
export async function registerUser(data: RegisterData) {
  const result = await signUp(data);
  return { success: !result.error, hasSession: !!result.data?.session, error: result.error || undefined };
}
export async function signIn({ email, password }: LoginData) {
  try { return await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password }); }
  catch { return { data: null, error: { message: connectionMessage } }; }
}
export async function loginUser(data: LoginData) {
  const result = await signIn(data);
  return { success: !result.error, error: result.error ? { message: 'Não foi possível entrar. Confira e-mail, senha e confirmação do cadastro.' } : undefined };
}
export async function resendConfirmation(email: string) {
  try { return await supabase.auth.resend({ type: 'signup', email: email.trim().toLowerCase(), options: { emailRedirectTo: `${window.location.origin}/auth/callback` } }); }
  catch { return { error: { message: connectionMessage } }; }
}
export async function logoutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error('Não foi possível sair. Tente novamente.');
}
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}
