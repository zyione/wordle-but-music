import { useEffect, useRef, useState, useCallback } from 'react';
import { apiFetch } from '../lib/api.js';
export default function usePartyPolling({ code, apiBaseUrl, onStateUpdate, enabled = true }) {
  const callback = useRef(onStateUpdate); callback.current = onStateUpdate;
  const active = useRef(null);
  const [error, setError] = useState(null);
  const refresh = useCallback(async () => {
    if (!code || active.current) return;
    const controller = new AbortController(); active.current = controller;
    try {
      const response = await apiFetch(`${apiBaseUrl}/api/party/${code}`, { signal: controller.signal });
      const state = await response.json();
      if (!response.ok) throw new Error(state.error || 'Unable to update standings.');
      if (!controller.signal.aborted) { setError(null); callback.current?.(state); }
    } catch (error) { if (!controller.signal.aborted) setError(error.message); }
    finally { if (active.current === controller) active.current = null; }
  }, [code, apiBaseUrl]);
  useEffect(() => {
    if (!enabled || !code) return;
    const timer = setInterval(refresh, 2500);
    return () => { clearInterval(timer); active.current?.abort(); active.current = null; };
  }, [enabled, code, refresh]);
  return { refresh, error };
}
