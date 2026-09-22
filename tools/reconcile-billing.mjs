// Reads credentials from the server environment; never logs secrets or raw errors.
try {
 const base=process.env.BOLSU_APP_URL,secret=process.env.BOLSU_BILLING_RECONCILE_SECRET;
 if(!base||!secret||secret.length<32)throw new Error('configuration');
 const response=await fetch(new URL('/api/billing/reconcile',base),{method:'POST',redirect:'error',headers:{Authorization:'Bearer '+secret},signal:AbortSignal.timeout(300000)});
 const result=await response.json();
 console.log({status:response.status,processed:result.processed??0,failed:result.failed??0,pending:result.pending??null,skipped:result.skipped??false});
 if(!response.ok)process.exitCode=1;
} catch {
 console.error('Reconciliação indisponível. Confira o servidor local, as variáveis privadas e a conexão.');process.exitCode=1;
}
