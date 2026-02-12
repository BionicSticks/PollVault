/**
 * Sample size adequacy assessment
 */

export type SampleAdequacy = "excellent" | "good" | "fair" | "insufficient";

export interface SampleAssessment {
  adequacy: SampleAdequacy;
  label: string;
  description: string;
  minRecommended: number;
}

/**
 * Assess whether the sample size is adequate for reliable conclusions
 */
export function assessSampleSize(
  n: number,
  numOptions: number
): SampleAssessment {
  // Rule of thumb: at least 5 expected per cell for chi-squared,
  // at least 30 per option for reasonable confidence intervals
  const perOption = n / numOptions;

  if (perOption >= 100) {
    return {
      adequacy: "excellent",
      label: "Excellent sample",
      description: `${n} responses provide high-confidence results`,
      minRecommended: numOptions * 100,
    };
  }

  if (perOption >= 30) {
    return {
      adequacy: "good",
      label: "Good sample",
      description: `${n} responses provide reliable results with moderate margins`,
      minRecommended: numOptions * 30,
    };
  }

  if (perOption >= 10) {
    return {
      adequacy: "fair",
      label: "Fair sample",
      description: `${n} responses - interpret with caution, wider margins of error`,
      minRecommended: numOptions * 10,
    };
  }

  return {
    adequacy: "insufficient",
    label: "Insufficient sample",
    description: `Only ${n} responses - results are not statistically reliable yet`,
    minRecommended: numOptions * 10,
  };
}

/**
 * Required sample size for a desired margin of error
 */
export function requiredSampleSize(
  desiredMargin: number,
  confidence: number = 0.95
): number {
  const zScores: Record<number, number> = {
    0.9: 1.645,
    0.95: 1.96,
    0.99: 2.576,
  };
  const z = zScores[confidence] || 1.96;

  // Worst case: p = 0.5 (maximum variance)
  return Math.ceil((z * z * 0.25) / (desiredMargin * desiredMargin));
}
