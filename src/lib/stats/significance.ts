/**
 * Chi-squared test for independence
 * Tests whether vote choices are independent of demographic groups
 */

interface ContingencyCell {
  observed: number;
  expected: number;
}

/**
 * Calculate chi-squared statistic from a contingency table
 * rows = options, columns = demographic groups
 */
export function chiSquared(
  observed: number[][]
): { statistic: number; degreesOfFreedom: number; pValue: number; significant: boolean } {
  const rows = observed.length;
  const cols = observed[0]?.length || 0;

  if (rows < 2 || cols < 2) {
    return { statistic: 0, degreesOfFreedom: 0, pValue: 1, significant: false };
  }

  const rowTotals = observed.map((row) => row.reduce((a, b) => a + b, 0));
  const colTotals: number[] = [];
  for (let j = 0; j < cols; j++) {
    colTotals.push(observed.reduce((sum, row) => sum + row[j], 0));
  }
  const total = rowTotals.reduce((a, b) => a + b, 0);

  if (total === 0) {
    return { statistic: 0, degreesOfFreedom: 0, pValue: 1, significant: false };
  }

  let chiSq = 0;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const expected = (rowTotals[i] * colTotals[j]) / total;
      if (expected > 0) {
        chiSq += Math.pow(observed[i][j] - expected, 2) / expected;
      }
    }
  }

  const df = (rows - 1) * (cols - 1);
  const pValue = chiSquaredPValue(chiSq, df);

  return {
    statistic: chiSq,
    degreesOfFreedom: df,
    pValue,
    significant: pValue < 0.05,
  };
}

/**
 * Approximate chi-squared p-value using the regularized incomplete gamma function
 */
function chiSquaredPValue(x: number, df: number): number {
  if (x <= 0 || df <= 0) return 1;
  return 1 - regularizedGammaP(df / 2, x / 2);
}

/**
 * Regularized incomplete gamma function P(a, x) using series expansion
 */
function regularizedGammaP(a: number, x: number): number {
  if (x < 0) return 0;
  if (x === 0) return 0;

  const maxIterations = 200;
  const epsilon = 1e-10;

  if (x < a + 1) {
    // Series expansion
    let sum = 1 / a;
    let term = 1 / a;
    for (let n = 1; n < maxIterations; n++) {
      term *= x / (a + n);
      sum += term;
      if (Math.abs(term) < epsilon) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - lnGamma(a));
  } else {
    // Continued fraction (Lentz's method)
    let f = 1e-30;
    let c = 1e-30;
    let d = 1 / (x + 1 - a);
    let h = d;
    for (let n = 1; n < maxIterations; n++) {
      const an = -n * (n - a);
      const bn = x + 2 * n + 1 - a;
      d = bn + an * d;
      if (Math.abs(d) < 1e-30) d = 1e-30;
      c = bn + an / c;
      if (Math.abs(c) < 1e-30) c = 1e-30;
      d = 1 / d;
      const delta = c * d;
      h *= delta;
      if (Math.abs(delta - 1) < epsilon) break;
    }
    return 1 - h * Math.exp(-x + a * Math.log(x) - lnGamma(a));
  }
}

/**
 * Log-gamma function (Stirling's approximation)
 */
function lnGamma(x: number): number {
  const coefficients = [
    76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.001208650973866179, -0.000005395239384953,
  ];

  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) {
    ser += coefficients[j] / ++y;
  }
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}
