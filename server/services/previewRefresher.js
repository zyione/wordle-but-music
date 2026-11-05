// Preview validation and renewal happen in the audio proxy when played.
// Puzzle requests must not download a second copy of the same clip.
export async function ensureFreshPreviewUrl(songId, title, artist, currentUrl) {
  return currentUrl || '';
}
