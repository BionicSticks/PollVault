/**
 * Wilson score confidence interval
 * Better than Wald interval for small samples and extreme proportions
 */
export function wilsonScore(
  successes: number,
  total: number,
  confidence: number = 0.95
): { lower: number; upper: number; center: number } {
  if (total === 0) return { lower: 0, upper: 0, center: 0 };

  // Z-scores for common confidence levels
  const zScores: Record<number, number> = {
    0.9: 1.645,
    0.95: 1.96,
    0.99: 2.576,
  };
  const z = zScores[confidence] || 1.96;

  const p = successes / total;
  const denominator = 1 + (z * z) / total;
  const center = (p + (z * z) / (2 * total)) / denominator;
  const margin =
    (z / denominator) *
    Math.sqrt(p * (1 - p) / total + (z * z) / (4 * total * total));

  return {
    lower: Math.max(0, center - margin),
    upper: Math.min(1, center + margin),
    center,
  };
}

/**
 * Margin of error for a proportion
 */
export function marginOfError(
  proportion: number,
  sampleSize: number,
  confidence: number = 0.95
): number {
  if (sampleSize === 0) return 0;

  const zScores: Record<number, number> = {
    0.9: 1.645,
    0.95: 1.96,
    0.99: 2.576,
  };
  const z = zScores[confidence] || 1.96;

  return z * Math.sqrt((proportion * (1 - proportion)) / sampleSize);
}
