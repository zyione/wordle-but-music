import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch, API_BASE_URL } from '../lib/api.js';
import { saveCachedPlaylist } from '../lib/playlistCache.js';
const activeKey = 'song_guesser_active_import';
function pause(signal) {
  return new Promise(resolve => { const done = () => { clearTimeout(timer); signal.removeEventListener('abort', done); resolve(); }; const timer = setTimeout(done, 800); signal.addEventListener('abort', done, { once: true }); });
}
export default function usePlaylistImport(onReady) {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const controller = useRef(null);
  const callback = useRef(onReady);
  callback.current = onReady;
  const watch = useCallback(async (jobId, signal) => {
    let launched = false;
    try {
      while (!signal.aborted) {
        const response = await apiFetch(`${API_BASE_URL}/api/spotify/import/${jobId}`, { signal });
        const job = await response.json();
        if (!response.ok) throw new Error(job.error || 'Unable to check playlist import.');
        if (signal.aborted) return;
        setStatus(job);
        if (job.readyCount >= 3 || job.isComplete && job.readyCount > 0) {
          saveCachedPlaylist(job);
          callback.current(job, !launched);
          launched = true;
        }
        if (job.error || job.status === 'cancelled') throw new Error(job.error || 'Import cancelled.');
        if (job.isComplete) { localStorage.removeItem(activeKey); return; }
        await pause(signal);
      }
    } catch (error) { if (!signal.aborted) { setError(error.message); setStatus(null); localStorage.removeItem(activeKey); } }
  }, []);
  useEffect(() => {
    const jobId = localStorage.getItem(activeKey);
    const active = new AbortController(); controller.current = active;
    if (jobId) watch(jobId, active.signal);
    return () => active.abort();
  }, [watch]);
  const start = async playlistUrl => {
    controller.current?.abort();
    const active = new AbortController(); controller.current = active;
    setError(null);
    setStatus({ isImporting: true, current: 0, total: 0, readyCount: 0 });
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/spotify/import`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playlistUrl }), signal: active.signal });
      const job = await response.json();
      if (!response.ok) throw new Error(job.error || 'Unable to start playlist import.');
      if (active.signal.aborted) return { error: 'Import cancelled.' };
      localStorage.setItem(activeKey, job.jobId);
      watch(job.jobId, active.signal);
      return { success: true };
    } catch (error) { if (!active.signal.aborted) { setError(error.message); setStatus(null); } return { error: error.message }; }
  };
  return { status, error, start };
}
