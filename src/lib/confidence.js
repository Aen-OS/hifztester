const CORRECT_BOOST = 0.15;
const INCORRECT_PENALTY = 0.25;
const DECAY_FACTOR = 0.97; // per day

/**
 * Compute the new raw confidence after an answer.
 * @param {number} current - current stored confidence (0-1)
 * @param {boolean} correct - whether the answer was correct
 * @returns {number} new confidence (0-1)
 */
export function updateConfidence(current, correct) {
  if (correct) {
    return Math.min(1.0, current + CORRECT_BOOST);
  }
  return Math.max(0.0, current - INCORRECT_PENALTY);
}

/**
 * Apply time decay to a confidence value.
 * @param {number} confidence - stored confidence (0-1)
 * @param {Date|string} lastTestedAt - when the ayah was last tested
 * @returns {number} decayed confidence (0-1)
 */
export function applyDecay(confidence, lastTestedAt) {
  const last = new Date(lastTestedAt);
  const now = new Date();
  const daysSince = (now - last) / (1000 * 60 * 60 * 24);
  if (daysSince <= 0) return confidence;
  return confidence * Math.pow(DECAY_FACTOR, daysSince);
}

/**
 * Compute initial confidence for a first-time ayah encounter.
 * @param {boolean} correct
 * @returns {number}
 */
export function initialConfidence(correct) {
  return correct ? CORRECT_BOOST : 0;
}
