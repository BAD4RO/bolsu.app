export function callbackErrorCode(error:{code?:string;name?:string}|null|undefined):'browser'|'1'{
 return error?.code==='pkce_code_verifier_not_found'||error?.code==='bad_code_verifier'||error?.name==='AuthPKCECodeVerifierMissingError'?'browser':'1';
}
export function callbackErrorMessage(code:string,recovery=false):string{
 if(code==='browser')return recovery
 ? 'A recuperação foi aberta em outro navegador ou os dados de acesso não estão mais disponíveis. Solicite um novo link e abra-o no mesmo navegador em que fez o pedido.'
 : 'Não foi possível entrar automaticamente neste navegador. Seu e-mail pode já estar confirmado: entre com o e-mail e a senha cadastrados. Não é necessário criar outra conta.';
 return 'Não foi possível entrar por este link. Se já confirmou seu e-mail, entre com e-mail e senha. Caso contrário, solicite uma nova confirmação.';
}
