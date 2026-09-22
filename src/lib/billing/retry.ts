// Retry only acquisition conflicts: never replay a Stripe mutation or an applied snapshot.
export async function acquireWithRetry<T extends {error: {code?:string}|null}>(
 acquire:()=>PromiseLike<T>,
 wait:(ms:number)=>Promise<void>=ms=>new Promise(resolve=>setTimeout(resolve,ms)),
){
 for(let attempt=0;;attempt++){
  const result=await acquire();
  if(result.error?.code!=='55P03'||attempt===4)return result;
  await wait(250*2**attempt+Math.floor(Math.random()*100));
 }
}
export function needsPaymentVerification(status:string){
 return ['active','past_due','canceled','trialing'].includes(status);
}
