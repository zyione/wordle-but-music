/**
 * Calculates game score based on outcome, completion speed, skips, and wrong guesses.
 */
export function calculateScore({ isSolved, guessNumber = 6, maxGuesses = 6, timeTakenMs = 0, skipsUsed = 0, wrongGuesses = 0 }) {
  if (!isSolved) {
    return 0;
  }

  const baseScore = 1000;
  const timeSeconds = Math.max(0, Math.floor(timeTakenMs / 1000));
  const timePenalty = timeSeconds * 2;
  const skipPenalty = Math.max(0, skipsUsed) * 100;
  const wrongGuessPenalty = Math.max(0, wrongGuesses) * 50;
  const guessBonus = Math.max(0, maxGuesses - guessNumber) * 150;

  const totalScore = baseScore - timePenalty - skipPenalty - wrongGuessPenalty + guessBonus;
  return Math.max(0, totalScore);
}
