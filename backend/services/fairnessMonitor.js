// ─── SkillMatrix Fairness Monitor ──────────────────────────────────
// Continuously audits score distributions for bias signals

class FairnessMonitor {
  /**
   * Calculate Fairness Score (0–100)
   * 100 = perfect parity, 0 = extreme bias
   */
  static calculateFairnessScore(submissions) {
    if (!submissions || submissions.length < 5) {
      return { score: null, reason: 'Not enough data (min 5 submissions)' };
    }

    const scores = submissions.map(s => s.totalScore);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    // Lower stdDev relative to mean = more consistent = fairer
    const cv = (stdDev / avg) * 100; // coefficient of variation
    const fairnessScore = Math.max(0, Math.min(100, Math.round(100 - cv)));

    return {
      score: fairnessScore,
      avg: Math.round(avg),
      stdDev: Math.round(stdDev * 10) / 10,
      cv: Math.round(cv * 10) / 10,
      total: submissions.length,
    };
  }

  /**
   * Check demographic parity after identity reveal
   * Compares pass rates across revealed demographic groups
   */
  static checkDemographicParity(revealedCandidates) {
    if (!revealedCandidates || revealedCandidates.length < 3) {
      return { status: 'insufficient_data', message: 'Need at least 3 revealed candidates' };
    }

    // Group by gender if available
    const groups = {};
    revealedCandidates.forEach(c => {
      const key = c.realGender || 'unknown';
      if (!groups[key]) groups[key] = [];
      groups[key].push(c.totalScore);
    });

    const groupStats = {};
    Object.entries(groups).forEach(([group, scores]) => {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      const passRate = (scores.filter(s => s >= 60).length / scores.length) * 100;
      groupStats[group] = { count: scores.length, avgScore: Math.round(avg), passRate: Math.round(passRate) };
    });

    // Calculate max parity gap
    const passRates = Object.values(groupStats).map(g => g.passRate);
    const maxGap = Math.max(...passRates) - Math.min(...passRates);

    return {
      status: maxGap <= 10 ? 'fair' : maxGap <= 20 ? 'monitor' : 'alert',
      maxParityGap: maxGap,
      groups: groupStats,
      message: maxGap <= 10
        ? 'Pass rates are within acceptable parity range'
        : maxGap <= 20
        ? 'Moderate gap detected — monitor closely'
        : 'Significant parity gap — review assessment questions',
    };
  }

  /**
   * Score distribution analysis — detect if scores are suspiciously clustered
   */
  static analyzeScoreDistribution(scores) {
    if (!scores || scores.length < 3) return null;

    const sorted = [...scores].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const median = sorted[Math.floor(sorted.length / 2)];

    const flags = [];
    if (iqr < 5) flags.push({ type: 'low_variance', message: 'Scores are unusually clustered — assessment may lack discrimination power' });
    if (median < 30) flags.push({ type: 'difficulty', message: 'Median score very low — assessment may be too difficult or unclear' });
    if (median > 90) flags.push({ type: 'ceiling', message: 'Median score very high — assessment may be too easy' });

    return {
      q1, q3, iqr, median,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      flags,
    };
  }

  /**
   * Build complete fairness report
   */
  static buildFairnessReport(submissions, revealedCandidates = []) {
    const scores = submissions.map(s => s.totalScore);
    const fairness = this.calculateFairnessScore(submissions);
    const distribution = this.analyzeScoreDistribution(scores);
    const parity = revealedCandidates.length > 0
      ? this.checkDemographicParity(revealedCandidates)
      : { status: 'pending', message: 'No reveals yet — parity check pending' };

    const overallStatus = fairness.score >= 80 ? 'green' : fairness.score >= 60 ? 'yellow' : 'red';

    return {
      overallStatus,
      fairnessScore: fairness.score,
      stats: fairness,
      distribution,
      parity,
      generatedAt: new Date().toISOString(),
      summary: overallStatus === 'green'
        ? 'Assessment is performing fairly across the candidate pool'
        : overallStatus === 'yellow'
        ? 'Some variation detected — review flagged items'
        : 'Significant fairness concerns detected — immediate review recommended',
    };
  }
}

module.exports = FairnessMonitor;
