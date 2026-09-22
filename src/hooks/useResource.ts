'use client';
import { useCallback, useEffect, useState } from 'react';
export async function apiRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url,{...options,cache:'no-store',headers:{'Content-Type':'application/json',...options?.headers}});
  const result = await response.json();
  if(!response.ok) throw new Error(result.error || 'Não foi possível completar a solicitação.');
  return result as T;
}
export function useResource<T>(url: string) {
  const [data,setData] = useState<T|null>(null);
  const [error,setError] = useState('');
  const [loading,setLoading] = useState(true);
  const [version,setVersion] = useState(0);
  const reload = useCallback(()=>setVersion(v=>v+1),[]);
  useEffect(()=>{
    const controller = new AbortController();
    setLoading(true); setError(''); setData(null);
    apiRequest<T>(url,{signal:controller.signal})
      .then(value=>{if(!controller.signal.aborted)setData(value);})
      .catch(err=>{if(!controller.signal.aborted)setError(err instanceof Error ? err.message : 'Erro de conexão.');})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[url,version]);
  return {data,error,loading,reload};
}
