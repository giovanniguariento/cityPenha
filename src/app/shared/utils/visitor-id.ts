const STORAGE_KEY = 'citypenha_visitor_id';

/**
 * UUID v4 persistente para deduplicar views anônimas (POST /post/:id/view).
 * Retorna string vazia fora do browser ou se storage falhar.
 */
export function getOrCreateVisitorId(): string {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return '';
  }

  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return '';
  }
}
