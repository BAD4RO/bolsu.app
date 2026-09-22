import {test} from 'node:test';
import assert from 'node:assert/strict';
import {callbackErrorCode,callbackErrorMessage} from '../src/lib/domain/auth-callback';
test('troca de navegador é diferente de link expirado, sem afirmar confirmação não verificada',()=>{assert.equal(callbackErrorCode({code:'pkce_code_verifier_not_found'}),'browser');assert.equal(callbackErrorCode({code:'bad_code_verifier'}),'browser');assert.equal(callbackErrorCode({code:'otp_expired'}),'1');assert.match(callbackErrorMessage('browser'),/pode já estar confirmado/);assert.doesNotMatch(callbackErrorMessage('browser'),/expirou|inválido/);});
test('recuperação entre navegadores orienta novo pedido no mesmo navegador',()=>{assert.match(callbackErrorMessage('browser',true),/Solicite um novo link/);assert.match(callbackErrorMessage('browser',true),/mesmo navegador/);});
