export function summarizeDaily(rows, today = new Date().toISOString().slice(0, 10)) {
  const days = [...new Map(rows.map(row => [row.puzzleDate, row])).values()].sort((a, b) => a.puzzleDate.localeCompare(b.puzzleDate));
  let streak = 0, maxStreak = 0, won = 0, previous = null;
  for (const row of days) {
    const day = Date.parse(`${row.puzzleDate}T00:00:00Z`);
    if (row.isSolved) { won++; streak = previous !== null && day - previous === 86400000 ? streak + 1 : 1; }
    else streak = 0;
    maxStreak = Math.max(maxStreak, streak);
    previous = day;
  }
  const age = previous === null ? Infinity : (Date.parse(`${today}T00:00:00Z`) - previous) / 86400000;
  return { played: days.length, won, currentStreak: age <= 1 && age >= 0 ? streak : 0, maxStreak };
}
