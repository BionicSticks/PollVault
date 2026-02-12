/**
 * Demographic post-stratification weighting
 * Adjusts poll results to account for over/under-representation of demographic groups
 */

export interface DemographicDistribution {
  [group: string]: number; // proportion (0-1) in the target population
}

export interface TallyRow {
  option_id: string;
  age_range: string;
  gender: string;
  country: string;
  count: number;
}

export interface WeightedResult {
  optionId: string;
  rawCount: number;
  rawProportion: number;
  weightedProportion: number;
  weight: number;
}

// Known population distributions (approximate, for weighting)
// These would ideally be configurable or fetched from a reference dataset
export const KNOWN_DISTRIBUTIONS: Record<string, DemographicDistribution> = {
  age_range: {
    "18-24": 0.12,
    "25-34": 0.18,
    "35-44": 0.17,
    "45-54": 0.16,
    "55-64": 0.15,
    "65+": 0.14,
    unspecified: 0.08,
  },
  gender: {
    male: 0.49,
    female: 0.49,
    "non-binary": 0.01,
    unspecified: 0.01,
  },
};

/**
 * Calculate post-stratification weights for a single demographic dimension
 */
export function calculateWeights(
  sampleDistribution: DemographicDistribution,
  populationDistribution: DemographicDistribution
): Record<string, number> {
  const weights: Record<string, number> = {};

  for (const group of Object.keys(populationDistribution)) {
    const sampleProp = sampleDistribution[group] || 0;
    const popProp = populationDistribution[group] || 0;

    if (sampleProp > 0) {
      // Cap weights to prevent extreme values
      weights[group] = Math.min(Math.max(popProp / sampleProp, 0.2), 5.0);
    } else {
      weights[group] = 1.0;
    }
  }

  return weights;
}

/**
 * Apply demographic weighting to poll results
 */
export function weightResults(
  tallies: TallyRow[],
  dimension: "age_range" | "gender"
): WeightedResult[] {
  const populationDist = KNOWN_DISTRIBUTIONS[dimension];
  if (!populationDist) return [];

  // Calculate sample distribution for this dimension
  const totalByGroup: Record<string, number> = {};
  let grandTotal = 0;

  for (const row of tallies) {
    const group = row[dimension];
    totalByGroup[group] = (totalByGroup[group] || 0) + row.count;
    grandTotal += row.count;
  }

  if (grandTotal === 0) return [];

  const sampleDist: DemographicDistribution = {};
  for (const [group, count] of Object.entries(totalByGroup)) {
    sampleDist[group] = count / grandTotal;
  }

  const weights = calculateWeights(sampleDist, populationDist);

  // Calculate weighted results per option
  const optionTotals: Record<
    string,
    { raw: number; weighted: number }
  > = {};
  let weightedGrandTotal = 0;

  for (const row of tallies) {
    const group = row[dimension];
    const weight = weights[group] || 1.0;
    const weightedCount = row.count * weight;

    if (!optionTotals[row.option_id]) {
      optionTotals[row.option_id] = { raw: 0, weighted: 0 };
    }
    optionTotals[row.option_id].raw += row.count;
    optionTotals[row.option_id].weighted += weightedCount;
    weightedGrandTotal += weightedCount;
  }

  return Object.entries(optionTotals).map(([optionId, totals]) => ({
    optionId,
    rawCount: totals.raw,
    rawProportion: totals.raw / grandTotal,
    weightedProportion:
      weightedGrandTotal > 0 ? totals.weighted / weightedGrandTotal : 0,
    weight: totals.weighted / totals.raw,
  }));
}
