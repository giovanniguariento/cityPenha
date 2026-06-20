import { getOrCreateVisitorId } from './visitor-id';

describe('getOrCreateVisitorId', () => {
  const storageKey = 'citypenha_visitor_id';

  beforeEach(() => {
    localStorage.removeItem(storageKey);
  });

  it('creates and persists a UUID v4', () => {
    const id = getOrCreateVisitorId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    expect(localStorage.getItem(storageKey)).toBe(id);
  });

  it('returns the same id on subsequent calls', () => {
    const first = getOrCreateVisitorId();
    const second = getOrCreateVisitorId();
    expect(second).toBe(first);
  });
});
