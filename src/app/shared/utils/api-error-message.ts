import { HttpErrorResponse } from '@angular/common/http';
import { ApiErrorBody } from '../interface/home.interface';

const GENERIC = 'Algo deu errado. Tente novamente em instantes.';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function isApiErrorBody(v: unknown): v is ApiErrorBody {
  return isRecord(v) && typeof v['message'] === 'string';
}

/**
 * Extrai mensagem amigável de erro HTTP para exibir ao utilizador (pt-BR).
 */
export function apiErrorMessage(err: unknown, fallback = GENERIC): string {
  if (err instanceof HttpErrorResponse) {
    const body = err.error;
    if (typeof body === 'string' && body.trim()) {
      return body.trim();
    }
    if (isApiErrorBody(body) && body.message.trim()) {
      return body.message.trim();
    }
    if (isRecord(body) && typeof body['message'] === 'string' && body['message'].trim()) {
      return body['message'].trim();
    }
    if (err.status === 0) {
      return 'Sem ligação à internet. Verifique a rede e tente de novo.';
    }
    if (err.status === 401 || err.status === 403) {
      return 'Sessão inválida ou sem permissão. Faça login novamente.';
    }
    if (err.status === 404) {
      return 'Conteúdo não encontrado.';
    }
    if (err.status >= 500) {
      return 'O servidor está indisponível. Tente mais tarde.';
    }
    return fallback;
  }
  if (err instanceof Error && err.message.trim()) {
    return err.message.trim();
  }
  return fallback;
}
