import { db } from '../core/database.js';

export class UpsellConversionService {
  /**
   * Tracks if a new booking or an updated booking should be attributed to an upsell campaign.
   */
  public static async trackUpsellConversion(professionalId: string, clientId: string, newServiceId: string, bookingId: string, revenue: number, appointmentDate: Date | string) {
    try {
      // 1. Look for a sent upsell message to this client that matches the offer_service_id being added today.
      // E.g., The message was sent in the last 7 days and offered this specific service.
      const recipient = await db.queryOne<any>(
        `SELECT r.id, r.rule_id 
         FROM upsell_recipients r
         JOIN upsell_rules rule ON r.rule_id = rule.id
         WHERE r.client_id = ? 
         AND r.professional_id = ?
         AND rule.offer_service_id = ?
         AND r.status = 'sent' 
         AND r.sent_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
         ORDER BY r.sent_at DESC LIMIT 1`,
        [clientId, professionalId, newServiceId]
      );

      if (recipient) {
        // Mark recipient as converted
        await db.execute(
          `UPDATE upsell_recipients 
           SET status = 'converted', delivered_at = NOW() 
           WHERE id = ?`, 
          [recipient.id]
        );

        // Insert event logging the incremental revenue
        await db.execute(
          `INSERT INTO upsell_events (id, professional_id, client_id, rule_id, booking_id, event_type, value)
           VALUES (?, ?, ?, ?, ?, 'completed', ?)`,
          [db.uuid(), professionalId, clientId, recipient.rule_id, bookingId, revenue]
        );
      }
    } catch (err) {
      console.error('[UpsellConversionService] Error tracking upside conversion', err);
    }
  }
}
