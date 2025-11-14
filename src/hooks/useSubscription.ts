'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export type PlanType = 'free' | 'premium';

export interface SubscriptionData {
  tipo_plano: PlanType;
  possui_trial: boolean;
  data_fim_trial: string | null;
  data_fim_plano: string | null;
  isPremium: boolean;
  isTrialActive: boolean;
  hasAccess: boolean;
}

export const PLAN_LIMITS = {
  free: {
    metas: 3,
    cartoes: 1,
    transacoes_mes: 50,
  },
  premium: {
    metas: Infinity,
    cartoes: Infinity,
    transacoes_mes: Infinity,
  },
};

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    const fetchSubscription = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('tipo_plano, possui_trial, data_fim_trial, data_fim_plano')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Erro ao buscar assinatura:', error);
        setLoading(false);
        return;
      }

      const now = new Date();
      const isTrialActive =
        data.possui_trial &&
        data.data_fim_trial &&
        new Date(data.data_fim_trial) > now;

      const isPremiumActive =
        data.tipo_plano === 'premium' &&
        (!data.data_fim_plano || new Date(data.data_fim_plano) > now);

      const hasAccess = isPremiumActive || isTrialActive;

      setSubscription({
        tipo_plano: data.tipo_plano,
        possui_trial: data.possui_trial,
        data_fim_trial: data.data_fim_trial,
        data_fim_plano: data.data_fim_plano,
        isPremium: isPremiumActive,
        isTrialActive,
        hasAccess,
      });
      setLoading(false);
    };

    fetchSubscription();
  }, [user]);

  const checkLimit = async (type: 'metas' | 'cartoes' | 'transacoes_mes'): Promise<boolean> => {
    if (!user || !subscription) return false;

    // Premium tem acesso ilimitado
    if (subscription.hasAccess) return true;

    // Verificar limites do plano free
    const limit = PLAN_LIMITS.free[type];

    if (type === 'metas') {
      const { count } = await supabase
        .from('metas')
        .select('*', { count: 'exact', head: true })
        .eq('usuario_id', user.id);
      return (count || 0) < limit;
    }

    if (type === 'cartoes') {
      const { count } = await supabase
        .from('cartoes')
        .select('*', { count: 'exact', head: true })
        .eq('usuario_id', user.id);
      return (count || 0) < limit;
    }

    if (type === 'transacoes_mes') {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from('transacoes')
        .select('*', { count: 'exact', head: true })
        .eq('usuario_id', user.id)
        .gte('data', startOfMonth.toISOString());

      return (count || 0) < limit;
    }

    return false;
  };

  const upgradeToPremium = async () => {
    if (!user) return { error: 'Usuário não autenticado' };

    const dataFimPlano = new Date();
    dataFimPlano.setMonth(dataFimPlano.getMonth() + 1);

    const { error } = await supabase
      .from('users')
      .update({
        tipo_plano: 'premium',
        data_fim_plano: dataFimPlano.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (!error) {
      // Atualizar estado local
      setSubscription((prev) =>
        prev
          ? {
              ...prev,
              tipo_plano: 'premium',
              data_fim_plano: dataFimPlano.toISOString(),
              isPremium: true,
              hasAccess: true,
            }
          : null
      );
    }

    return { error };
  };

  return {
    subscription,
    loading,
    checkLimit,
    upgradeToPremium,
  };
}
