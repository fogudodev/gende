import { db } from '../core/database.js';
import { UpsellScoringService } from './UpsellScoringService.js';

export class UpsellOpportunityService {
  /**
   * Scans bookings and clients to generate dynamic upsell opportunities based on PRD rules.
   * Rule 1: Missed Services / Complementary
   */
  public static async generateOpportunities(professionalId: string): Promise<{ created: number }> {
    let createdCount = 0;

    // 1. Get all upcoming bookings in next 15 days to find people we can send an offer to
    const upcomingBookings = await db.query<any>(
      `SELECT b.id, b.client_id, b.service_id, b.start_time 
       FROM bookings b
       WHERE b.professional_id = ? 
       AND b.start_time > NOW() AND b.start_time < DATE_ADD(NOW(), INTERVAL 15 DAY)
       AND b.status IN ('confirmed', 'pending')`,
       [professionalId]
    );

    // Find the most popular service in the salon as a generic target
    const [topServiceRow] = await db.query<any>(
      `SELECT service_id, COUNT(*) as cnt FROM bookings 
       WHERE professional_id = ? GROUP BY service_id ORDER BY cnt DESC LIMIT 1`,
      [professionalId]
    );

    const fallbackOfferId = topServiceRow?.service_id;
    if (!fallbackOfferId) return { created: 0 };

    // Set of clients we processed to avoid dupes in this run
    const processedClients = new Set<string>();

    for (const booking of upcomingBookings) {
      if (processedClients.has(booking.client_id)) continue;
      processedClients.add(booking.client_id);

      // We'll suggest the fallback service if it's not the one they are already doing
      const suggestedServiceId = booking.service_id !== fallbackOfferId ? fallbackOfferId : null;
      if (!suggestedServiceId) continue;

      // 2. Check if a pending opportunity already exists for this client + service
      const existing = await db.queryOne(
        `SELECT id FROM upsell_opportunities 
         WHERE client_id = ? AND suggested_service_id = ? AND status = 'pending'`,
        [booking.client_id, suggestedServiceId]
      );
      if (existing) continue;

      // 3. Score the Opportunity
      const history = await db.query<any>(`SELECT * FROM bookings WHERE client_id = ? AND start_time < NOW()`, [booking.client_id]);
      const score = UpsellScoringService.calculateOpportunityScore(history, suggestedServiceId);
      const priority = UpsellScoringService.getPriority(score);

      // Only generated Medium or High priority opportunities to avoid spam
      if (priority === 'high' || priority === 'medium') {
        await db.execute(
          `INSERT INTO upsell_opportunities (id, professional_id, client_id, suggested_service_id, score, priority, status)
           VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
          [db.uuid(), professionalId, booking.client_id, suggestedServiceId, score, priority]
        );
        createdCount++;
      }
    }

    return { created: createdCount };
  }
}
