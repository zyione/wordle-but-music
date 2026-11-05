export const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL || 'http://localhost:4000').replace(/\/+$/, '');
let sessionPromise;
export function getSession() {
  if (!sessionPromise) sessionPromise = (async () => {
    const token = localStorage.getItem('song_guesser_session_token');
    const response = await window.fetch(`${API_BASE_URL}/api/session`, { method: 'POST', signal: AbortSignal.timeout(20000), headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!response.ok) throw new Error('Unable to start game session. Please retry.');
    const session = await response.json();
    localStorage.setItem('song_guesser_session_token', session.token);
    return session;
  })().catch(error => { sessionPromise = undefined; throw error; });
  return sessionPromise;
}
export async function apiFetch(url, options = {}) {
  if (new URL(url, API_BASE_URL).origin !== new URL(API_BASE_URL).origin) throw new Error('Invalid API destination');
  const session = await getSession();
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${session.token}`);
  const timeout = AbortSignal.timeout(20000);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
  return window.fetch(url, { ...options, headers, signal });
}
