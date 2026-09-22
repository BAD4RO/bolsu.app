'use client';
import { useResource } from './useResource';
import type { PlanSnapshot } from '@/lib/plans.types';
export function useSubscription() {
  const resource = useResource<PlanSnapshot>('/api/subscription');
  return {...resource,subscription:resource.data?.subscription ?? null,hasPlus:resource.data?.hasPlus ?? false};
}
