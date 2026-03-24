export interface ScoringInputs {
  daysSinceLastVisit: number;
  appointmentsCount: number;
  averageTicket: number;
  avgReturnIntervalDays: number;
}

export interface ScoringOutput {
  score: number;
  status: 'inactive' | 'warning' | 'churn_risk' | 'high_priority';
}

export class ReactivationScoringService {
  /**
   * Calculates the reactivation score (0-100) based on RFM principles adapted for salon suites.
   * 
   * Recency: Less days = higher score (up to a limit, after too long it drops as they might be lost)
   * Frequency: More appointments = higher score (loyal client)
   * Monetary: Higher average ticket = higher score (valuable client)
   * Consistency: How close they are to their avg return interval.
   */
  public static calculateScore(inputs: ScoringInputs): ScoringOutput {
    const { daysSinceLastVisit, appointmentsCount, averageTicket, avgReturnIntervalDays } = inputs;
    
    // 1. Frequency Score (0-30 points)
    // Caps at 10 appointments for max score
    const frequencyScore = Math.min((appointmentsCount / 10) * 30, 30);

    // 2. Monetary Score (0-30 points)
    // Assuming a standard high ticket is ~200 (currency agnostic in logic, adjust as needed). Caps at 30 pts.
    const maxExpectedTicket = 200; 
    const monetaryScore = Math.min((averageTicket / maxExpectedTicket) * 30, 30);

    // 3. Recency & Consistency Score (0-40 points)
    // Calculates how far past their expected return window they are.
    // If they are exactly at their return window or slightly past, high priority.
    // If they are WAY past (e.g., 6 months), the score drops because probability of return is lower.
    const expectedReturn = avgReturnIntervalDays > 0 ? avgReturnIntervalDays : 30; // 30 days global fallback
    const daysOverdue = daysSinceLastVisit - expectedReturn;

    let recencyScore = 0;
    
    if (daysOverdue < 0) {
      // Not yet due
      recencyScore = 10; // low score for reactivation since they aren't overdue yet
    } else if (daysOverdue <= 15) {
      // Just became overdue - High chance of recovery!
      recencyScore = 40;
    } else if (daysOverdue <= 45) {
      // Getting cold
      recencyScore = 25;
    } else if (daysOverdue <= 90) {
      // Cold
      recencyScore = 10;
    } else {
      // Very cold (churned)
      recencyScore = 5;
    }

    // Total Score
    const score = Math.round(frequencyScore + monetaryScore + recencyScore);
    const finalScore = Math.min(Math.max(score, 0), 100);

    // Map to status
    let status: ScoringOutput['status'] = 'inactive';
    if (finalScore <= 30) {
      status = 'inactive';
    } else if (finalScore <= 60) {
      status = 'warning';
    } else if (finalScore <= 80) {
      status = 'churn_risk';
    } else {
      status = 'high_priority';
    }

    return {
      score: finalScore,
      status
    };
  }
}
