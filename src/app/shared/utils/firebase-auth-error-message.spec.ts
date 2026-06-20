import { firebaseAuthErrorMessage } from './firebase-auth-error-message';

describe('firebaseAuthErrorMessage', () => {
  it('maps known Firebase auth codes to pt-BR messages', () => {
    expect(firebaseAuthErrorMessage({ code: 'auth/email-already-in-use' })).toBe(
      'Este e-mail já está em uso.'
    );
    expect(firebaseAuthErrorMessage({ code: 'auth/weak-password' })).toBe(
      'A senha deve ter pelo menos 6 caracteres.'
    );
    expect(firebaseAuthErrorMessage({ code: 'auth/invalid-credential' })).toBe(
      'E-mail ou senha incorretos.'
    );
    expect(firebaseAuthErrorMessage({ code: 'auth/user-not-found' })).toBe(
      'Não encontrámos conta com este e-mail.'
    );
  });

  it('returns fallback for unknown errors', () => {
    expect(firebaseAuthErrorMessage({ code: 'auth/unknown-code' })).toBe(
      'Não foi possível concluir a operação. Tente novamente.'
    );
    expect(
      firebaseAuthErrorMessage({ code: 'auth/unknown-code' }, 'Mensagem customizada.')
    ).toBe('Mensagem customizada.');
  });
});
