'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { signIn, signUp, logoutUser } from '@/lib/auth';
import type { User } from '@supabase/supabase-js';
export function useAuth() {
  const [user,setUser] = useState<User|null>(null);
  const [loading,setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    // INITIAL_SESSION is emitted by the client; no competing getSession request.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) { setUser(session?.user ?? null); setLoading(false); }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);
  return { user, loading,
    signIn: (email: string,password: string) => signIn({email,password}),
    signUp: (email: string,password: string,nome = '') => signUp({email,password,nome}),
    signOut: async () => { try { await logoutUser(); return {error:null}; } catch { return {error:{message:'Não foi possível sair.'}}; } },
  };
}
