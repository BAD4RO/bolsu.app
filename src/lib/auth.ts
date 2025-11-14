/**
 * 🔐 SISTEMA DE AUTENTICAÇÃO
 * 
 * Funções para registro, login e gerenciamento de usuários
 * com suporte completo a Row Level Security (RLS)
 */

import { supabase } from './supabase';

export interface RegisterData {
  nome: string;
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthError {
  message: string;
}

// Validar email
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Registrar novo usuário
 * 
 * ✅ Cria usuário no Supabase Auth
 * ✅ Perfil é criado automaticamente via Database Trigger
 * ✅ user_id é automaticamente auth.uid()
 */
export async function registerUser(data: RegisterData): Promise<{ success: boolean; error?: AuthError }> {
  try {
    // Validações básicas
    if (!data.nome || data.nome.trim().length < 3) {
      return { success: false, error: { message: 'Nome deve ter pelo menos 3 caracteres' } };
    }

    if (!data.email || !isValidEmail(data.email)) {
      return { success: false, error: { message: 'E-mail inválido' } };
    }

    if (!data.password || data.password.length < 6) {
      return { success: false, error: { message: 'Senha deve ter pelo menos 6 caracteres' } };
    }

    // Criar usuário no Supabase Auth
    // O perfil será criado automaticamente pelo trigger do banco
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email.trim().toLowerCase(),
      password: data.password,
      options: {
        data: {
          nome: data.nome.trim(),
        },
      },
    });

    if (authError) {
      // Mensagens de erro mais amigáveis
      if (authError.message.includes('already registered')) {
        return { success: false, error: { message: 'Este e-mail já está cadastrado' } };
      }
      return { success: false, error: { message: authError.message } };
    }

    if (!authData.user) {
      return { success: false, error: { message: 'Erro ao criar usuário' } };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: { message: error.message || 'Erro ao criar conta' } };
  }
}

/**
 * Login de usuário
 * 
 * ✅ Autentica no Supabase Auth
 * ✅ Estabelece sessão segura
 * ✅ RLS automaticamente filtra dados do usuário
 */
export async function loginUser(data: LoginData): Promise<{ success: boolean; error?: AuthError }> {
  try {
    // Validações básicas
    if (!data.email || !isValidEmail(data.email)) {
      return { success: false, error: { message: 'E-mail inválido' } };
    }

    if (!data.password || data.password.length < 6) {
      return { success: false, error: { message: 'Senha deve ter pelo menos 6 caracteres' } };
    }

    // Fazer login no Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: data.email.trim().toLowerCase(),
      password: data.password,
    });

    if (authError) {
      // Mensagens de erro mais amigáveis
      if (authError.message.includes('Invalid login credentials')) {
        return { success: false, error: { message: 'E-mail ou senha incorretos' } };
      }
      return { success: false, error: { message: 'E-mail ou senha incorretos' } };
    }

    if (!authData.user) {
      return { success: false, error: { message: 'Erro ao fazer login' } };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: { message: error.message || 'Erro ao fazer login' } };
  }
}

/**
 * Logout do usuário
 * 
 * ✅ Encerra sessão no Supabase
 * ✅ Limpa tokens de autenticação
 */
export async function logoutUser(): Promise<void> {
  await supabase.auth.signOut();
}

/**
 * Obter usuário autenticado atual
 * 
 * ✅ Retorna dados do usuário da sessão
 * ✅ Null se não autenticado
 */
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Obter perfil do usuário
 * 
 * ✅ RLS garante que só retorna perfil do próprio usuário
 * ✅ Não precisa filtrar por userId - RLS faz isso automaticamente
 */
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Erro ao buscar perfil:', error);
    return null;
  }

  return data;
}

/**
 * Atualizar perfil do usuário
 * 
 * ✅ RLS garante que só atualiza perfil do próprio usuário
 */
export async function updateUserProfile(userId: string, updates: Partial<{
  nome: string;
  telefone: string;
  data_nascimento: string;
  cpf: string;
  avatar_url: string;
}>) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar perfil:', error);
    return { success: false, error };
  }

  return { success: true, data };
}
