import db from '../db/db.js';
import { createRun, publicPuzzle } from './gameEngine.js';
import { randomInt, randomBytes } from 'node:crypto';
import { shuffleSongs } from './randomSongs.js';
import { parseSpotifyPlaylist } from './spotifyClient.js';
import { fetchTrackMetadata } from './deezerClient.js';

export function generatePartyCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(randomInt(chars.length));
  }
  return code;
}

export async function createParty({ hostAnonId, displayName = 'Host', avatarColor = '#3b82f6', numRounds = 5, maxPlayers = 10, songSource = 'random', playlistUrl }) {
  const code = generatePartyCode();
  const cappedMaxPlayers = Math.min(10, Math.max(2, Number(maxPlayers) || 10));
  const rounds = Math.min(10, Math.max(1, Number(numRounds) || 5));

  let playlistSongIds = [];

  if (songSource === 'spotify' && playlistUrl) {
    try {
      const parsed = await parseSpotifyPlaylist(playlistUrl);
      const insertStmt = db.prepare(`
        INSERT INTO songs (title, artist, album, artwork_url, preview_url, source, source_track_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(source_track_id) DO UPDATE SET
          title = excluded.title,
          artist = excluded.artist
      `);

      for (const track of parsed.songs.slice(0, 30)) {
        const existing = db.prepare('SELECT id FROM songs WHERE title = ? AND artist = ?').get(track.title, track.artist);
        if (existing) {
          playlistSongIds.push(existing.id);
        } else {
          const meta = await fetchTrackMetadata(track.title, track.artist);
          if (meta && meta.preview_url) {
            insertStmt.run(meta.title, meta.artist, meta.album, meta.artwork_url, meta.preview_url, meta.source, meta.source_track_id);
            const saved = db.prepare('SELECT id FROM songs WHERE source_track_id = ?').get(meta.source_track_id);
            if (saved) playlistSongIds.push(saved.id);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to parse party Spotify playlist, falling back to random DB songs:', err.message);
    }
  }

  if (!playlistSongIds.length) {
    const allSongs = db.prepare('SELECT id FROM songs').all();
    playlistSongIds = allSongs.map(s => s.id);
  }

  if (!playlistSongIds.length) {
    throw new Error('No playable songs available to create party.');
  }

  const seed = randomBytes(16).toString('hex');
  const candidates = db.prepare('SELECT id, preview_url FROM songs').all().filter(s => playlistSongIds.includes(s.id));
  const selectedRoundSongs = shuffleSongs(candidates).slice(0, rounds).map(s => s.id);
  if (!selectedRoundSongs.length) throw new Error('No playable songs available.');

  // Insert party record
  db.prepare(`
    INSERT INTO parties (code, host_anon_id, status, num_rounds, max_players, song_source, playlist_url, playlist_song_ids, seed)
    VALUES (?, ?, 'lobby', ?, ?, ?, ?, ?, ?)
  `).run(code, hostAnonId, selectedRoundSongs.length, cappedMaxPlayers, songSource, playlistUrl || null, selectedRoundSongs.join(','), seed);

  // Ensure host profile exists and add to party members
  db.prepare(`
    INSERT INTO party_members (party_code, anon_id, display_name, avatar_color)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(party_code, anon_id) DO UPDATE SET display_name = excluded.display_name, avatar_color = excluded.avatar_color
  `).run(code, hostAnonId, displayName, avatarColor);

  return {
    code,
    roundsCount: selectedRoundSongs.length,
    maxPlayers: cappedMaxPlayers,
    status: 'lobby'
  };
}

export function joinParty({ partyCode, anonId, displayName = 'Player', avatarColor = '#3b82f6' }) {
  const cleanCode = (partyCode || '').trim().toUpperCase();
  const party = db.prepare('SELECT * FROM parties WHERE code = ?').get(cleanCode);

  if (!party) {
    throw new Error('Party not found. Please check the party code.');
  }

  if (party.status !== 'lobby' && !db.prepare('SELECT id FROM party_members WHERE party_code = ? AND anon_id = ?').get(cleanCode, anonId)) throw new Error('This party has already started.');
  const existingMember = db.prepare('SELECT id FROM party_members WHERE party_code = ? AND anon_id = ?').get(cleanCode, anonId);
  const currentMembers = db.prepare('SELECT COUNT(*) as count FROM party_members WHERE party_code = ?').get(cleanCode);

  if (!existingMember && currentMembers.count >= party.max_players) {
    throw new Error(`Party is full (maximum ${party.max_players} players allowed).`);
  }

  db.prepare(`
    INSERT INTO party_members (party_code, anon_id, display_name, avatar_color)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(party_code, anon_id) DO UPDATE SET display_name = excluded.display_name, avatar_color = excluded.avatar_color
  `).run(cleanCode, anonId, displayName.trim().substring(0, 25), avatarColor);

  return getPartyState(cleanCode, anonId);
}

export function getPartyState(partyCode, currentAnonId = null) {
  const cleanCode = (partyCode || '').trim().toUpperCase();
  const party = db.prepare('SELECT * FROM parties WHERE code = ?').get(cleanCode);

  if (!party) {
    return null;
  }

  if (currentAnonId && !db.prepare('SELECT id FROM party_members WHERE party_code = ? AND anon_id = ?').get(cleanCode, currentAnonId)) return null;

  const members = db.prepare(`
    SELECT anon_id as anonId, display_name as displayName, avatar_color as avatarColor, joined_at as joinedAt
    FROM party_members
    WHERE party_code = ?
    ORDER BY joined_at ASC
  `).all(cleanCode);

  const songIds = (party.playlist_song_ids || '').split(',').map(Number).filter(Boolean);

  // Scores for all members across all rounds
  const rawScores = db.prepare(`
    SELECT round_number as roundNumber, anon_id as anonId, score, guesses_used as guessesUsed, time_taken_ms as timeTakenMs, is_solved as isSolved
    FROM party_scores
    WHERE party_code = ?
  `).all(cleanCode);

  // Aggregate cumulative totals per member
  const memberTotals = {};
  for (const m of members) {
    memberTotals[m.anonId] = {
      anonId: m.anonId,
      displayName: m.displayName,
      avatarColor: m.avatarColor,
      isHost: m.anonId === party.host_anon_id,
      totalScore: 0,
      roundsCompleted: 0,
      roundScores: {}
    };
  }

  for (const s of rawScores) {
    if (memberTotals[s.anonId]) {
      memberTotals[s.anonId].totalScore += s.score || 0;
      memberTotals[s.anonId].roundsCompleted += 1;
      memberTotals[s.anonId].roundScores[s.roundNumber] = {
        score: s.score,
        guessesUsed: s.guessesUsed,
        timeTakenMs: s.timeTakenMs,
        isSolved: Boolean(s.isSolved)
      };
    }
  }

  // Sort standings by totalScore DESC
  const standings = Object.values(memberTotals).sort((a, b) => b.totalScore - a.totalScore);
  standings.forEach((st, idx) => { st.rank = idx + 1; });

  return {
    code: party.code,
    hostAnonId: party.host_anon_id,
    status: party.status,
    numRounds: party.num_rounds,
    maxPlayers: party.max_players,
    songSource: party.song_source,
    playlistUrl: party.playlist_url,
    totalSongs: songIds.length,
    members,
    standings
  };
}

export function startParty(partyCode, hostAnonId) {
  const cleanCode = (partyCode || '').trim().toUpperCase();
  const party = db.prepare('SELECT * FROM parties WHERE code = ?').get(cleanCode);

  if (!party) {
    throw new Error('Party not found.');
  }

  if (party.host_anon_id !== hostAnonId) {
    throw new Error('Only the party host can start the game.');
  }

  if (party.status !== 'lobby') throw new Error('Party has already started.');
  db.prepare("UPDATE parties SET status = 'playing' WHERE code = ?").run(cleanCode);
  return getPartyState(cleanCode, hostAnonId);
}

export async function getPartyRoundSong(partyCode, roundNumber, anonId) {
  const cleanCode = (partyCode || '').trim().toUpperCase();
  const party = db.prepare('SELECT * FROM parties WHERE code = ?').get(cleanCode);

  if (!party) {
    throw new Error('Party not found.');
  }

  const member = db.prepare('SELECT id FROM party_members WHERE party_code = ? AND anon_id = ?').get(cleanCode, anonId);
  if (!member || party.status === 'lobby') throw new Error('Join the party and wait for the host to start.');
  if (!Number.isInteger(Number(roundNumber))) throw new Error('Invalid round number.');
  if (Number(roundNumber) > 1 && !db.prepare('SELECT id FROM party_scores WHERE party_code = ? AND anon_id = ? AND round_number = ?').get(cleanCode, anonId, Number(roundNumber) - 1)) throw new Error('Complete the previous round first.');
  const songIds = (party.playlist_song_ids || '').split(',').map(Number).filter(Boolean);
  const roundIdx = Number(roundNumber) - 1;

  if (roundIdx < 0 || roundIdx >= songIds.length) {
    throw new Error('Invalid round number.');
  }

  const songId = songIds[roundIdx];
  const song = db.prepare('SELECT id, title, artist, preview_url FROM songs WHERE id = ?').get(songId);

  if (!song) {
    throw new Error('Round song not found in database.');
  }

  const run = createRun({ owner: anonId, songId: song.id, mode: 'party', partyCode: cleanCode, roundNumber: Number(roundNumber) });
  return { ...publicPuzzle(run), roundNumber: Number(roundNumber), totalRounds: songIds.length };
}

export function submitPartyRoundResult({ partyCode, roundNumber, anonId, isSolved, guessesUsed, timeTakenMs, skipsUsed = 0, wrongGuesses = 0 }) {
  const cleanCode = (partyCode || '').trim().toUpperCase();
  const party = db.prepare('SELECT * FROM parties WHERE code = ?').get(cleanCode);

  if (!party) {
    throw new Error('Party not found.');
  }

  const completed = db.prepare("SELECT id FROM game_runs WHERE mode = 'party' AND party_code = ? AND owner_id = ? AND round_number = ? AND completed_at IS NOT NULL").get(cleanCode, anonId, Number(roundNumber));
  if (!completed) throw new Error('Complete this round before submitting a result.');
  return getPartyState(cleanCode, anonId);
}
