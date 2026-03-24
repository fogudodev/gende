import { db } from '../core/database.js';

export class ReactivationConversionService {
  /**
   * Tracks if a booking should be attributed to a recent reactivation campaign.
   */
  public static async trackBookingConversion(professionalId: string, clientId: string, bookingId: string, revenue: number) {
    try {
      // Look for campaign recipients within the last 15 days
      const recipient = await db.queryOne<any>(
        `SELECT r.id, r.campaign_id 
         FROM reactivation_campaign_recipients r
         JOIN reactivation_campaigns c ON r.campaign_id = c.id
         WHERE r.client_id = ? 
         AND c.professional_id = ?
         AND r.status = 'sent' 
         AND r.sent_at > DATE_SUB(NOW(), INTERVAL 15 DAY)
         ORDER BY r.sent_at DESC LIMIT 1`,
        [clientId, professionalId]
      );

      if (recipient) {
        // Mark recipient as converted
        await db.execute(
          `UPDATE reactivation_campaign_recipients 
           SET status = 'converted', delivered_at = NOW() 
           WHERE id = ?`, 
          [recipient.id]
        );

        // Insert conversion event
        await db.execute(
          `INSERT INTO reactivation_events (id, client_id, campaign_id, event_type, value)
           VALUES (?, ?, ?, 'completed', ?)`,
          [db.uuid(), clientId, recipient.campaign_id, revenue]
        );
      }
    } catch (err) {
      console.error('[ReactivationConversionService] Error tracking conversion', err);
    }
  }
}
