export async function readNdjson(body, onMessage, signal) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const consume = line => { if (line.trim() && !signal?.aborted) onMessage(JSON.parse(line)); };
  try {
    while (!signal?.aborted) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) consume(line);
    }
    buffer += decoder.decode();
    consume(buffer);
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
