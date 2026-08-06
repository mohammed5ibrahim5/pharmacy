const KEY = 'pharmacy_search_history';

export function trackSearch(term: string): void {
  const trimmed = (term || '').trim();
  if (!trimmed) return;
  try {
    const current = readSearchHistory();
    const updated = [trimmed, ...current.filter((t) => t !== trimmed)].slice(0, 10);
    localStorage.setItem(KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

export function readSearchHistory(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === 'string') : [];
  } catch {
    return [];
  }
}

export function clearSearchHistory(): void {
  localStorage.removeItem(KEY);
}
