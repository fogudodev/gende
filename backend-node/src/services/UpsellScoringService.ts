export class UpsellScoringService {
  /**
   * Calculates the Upsell Opportunity Score (0-100) based on PRD params.
   * Recency, Frequency, Service Gap, Ticket Potential
   */
  public static calculateOpportunityScore(history: any[], possibleSuggestedServiceId: string): number {
    let score = 0;
    
    // Frequency Factor
    const completedAppointments = history.filter(h => h.status === 'completed');
    if (completedAppointments.length > 5) score += 30;
    else if (completedAppointments.length > 2) score += 15;
    else if (completedAppointments.length > 0) score += 5;

    // Service Gap Factor: High score if they have never done this service, or hasn't done it recently
    const serviceHistory = history.filter(h => h.service_id === possibleSuggestedServiceId);
    if (serviceHistory.length === 0) {
      score += 40; // High gap = high opportunity
    } else {
      // Find recency of this specific service
      const latest = new Date(Math.max(...serviceHistory.map(h => new Date(h.start_time).getTime())));
      const daysSince = (new Date().getTime() - latest.getTime()) / (1000 * 3600 * 24);
      if (daysSince > 90) {
        score += 25; // Good opportunity to reintroduce
      } else {
        score += 5;
      }
    }

    // Baseline Ticket Potential
    score += 20;

    return Math.min(100, score);
  }

  public static getPriority(score: number): 'low' | 'medium' | 'high' {
    if (score >= 80) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
  }
}
