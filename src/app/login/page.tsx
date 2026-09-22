import Link from 'next/link';
import AuthScreen from '@/components/custom/auth-screen';
import {callbackErrorMessage} from '@/lib/domain/auth-callback';
export default async function LoginPage({searchParams}:{searchParams:Promise<{auth_error?:string;recovery?:string}>}) {
 const params=await searchParams;
 return <>{params.auth_error&&<div role="alert" className="p-4 text-center text-amber-200 text-sm max-w-xl mx-auto"><p>{callbackErrorMessage(params.auth_error,params.recovery==='1')}</p>{params.recovery==='1'&&<Link className="subtle-link mt-3" href="/recuperar-senha">Solicitar novo link de recuperação</Link>}</div>}<AuthScreen initialStep="login"/></>;
}
