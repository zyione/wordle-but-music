import { useEffect, useRef, useState } from 'react';
import { apiFetch, API_BASE_URL } from '../lib/api.js';
import { readNdjson } from '../lib/readNdjson.js';
import { saveCachedPlaylist } from '../lib/playlistCache.js';
export default function usePlaylistImport(onReady) {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const controller = useRef(null);
  const timer = useRef(null);
  const callback = useRef(onReady);
  callback.current = onReady;
  useEffect(() => () => { controller.current?.abort(); clearTimeout(timer.current); }, []);
  const start = async playlistUrl => {
    controller.current?.abort(); clearTimeout(timer.current);
    const active = new AbortController(); controller.current = active;
    setError(null);
    setStatus({ isImporting: true, current: 0, total: 0, readyCount: 0 });
    let launched = false, complete = false;
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/spotify/import`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playlistUrl }), signal: active.signal });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'Unable to import playlist.'); }
      await readNdjson(response.body, message => {
        if (message.type === 'error') throw new Error(message.error || 'Import failed.');
        if (message.type === 'init') setStatus({ isImporting: true, playlistName: message.playlistName, current: 0, total: message.total, readyCount: 0 });
        if (message.songIds?.length) {
          const playlist = { ...message, importedTracksCount: message.importedTracksCount, songIds: message.songIds };
          callback.current(playlist, !launched);
          launched = true;
        }
        if (message.type === 'progress' || message.type === 'first_match') setStatus({ isImporting: true, playlistName: message.playlistName, current: message.current || 0, total: message.total || 0, readyCount: message.importedTracksCount || 0 });
        if (message.type === 'complete') {
          complete = true; saveCachedPlaylist(message);
          setStatus({ isComplete: true, readyCount: message.importedTracksCount });
          timer.current = setTimeout(() => setStatus(null), 3500);
        }
      }, active.signal);
      if (!complete && !active.signal.aborted) throw new Error('Import connection interrupted. Please try again.');
    } catch (error) { if (!active.signal.aborted) { setError(error.message); setStatus(null); } }
  };
  return { status, error, start };
}
