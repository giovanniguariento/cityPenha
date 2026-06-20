const DEFAULT_MESSAGE = 'Não foi possível concluir a operação. Tente novamente.';

const FIREBASE_AUTH_MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'Este e-mail já está em uso.',
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/invalid-email': 'E-mail inválido.',
  'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
  'auth/operation-not-allowed': 'Cadastro por e-mail não está disponível.',
  'auth/network-request-failed': 'Sem ligação à internet. Verifique a rede e tente de novo.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde e tente novamente.',
  'auth/user-not-found': 'Não encontrámos conta com este e-mail.',
  'auth/wrong-password': 'Senha incorreta.',
  'auth/user-disabled': 'Esta conta foi desativada.',
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/**
 * Extrai mensagem amigável de erro Firebase Auth para exibir ao utilizador (pt-BR).
 */
export function firebaseAuthErrorMessage(err: unknown, fallback = DEFAULT_MESSAGE): string {
  if (isRecord(err) && typeof err['code'] === 'string') {
    const mapped = FIREBASE_AUTH_MESSAGES[err['code']];
    if (mapped) {
      return mapped;
    }
  }
  if (err instanceof Error && err.message.trim()) {
    return err.message.trim();
  }
  return fallback;
}
