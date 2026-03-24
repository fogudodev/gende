import { db } from '../core/database.js';

export interface EligibleUpsell {
  rule_id: string;
  professional_id: string;
  client_id: string;
  booking_id: string;
  trigger_service_name: string;
  offer_service_name: string;
  discount_percentage: number;
  message_template: string;
  client_phone: string;
  client_name: string;
}

export class UpsellEligibilityService {
  /**
   * Finds all eligible upcoming bookings that can receive an upsell offer.
   */
  public static async getEligibleUpsells(professionalId: string): Promise<EligibleUpsell[]> {
    const opportunities: EligibleUpsell[] = [];

    // 1. Get all active rules for this professional
    const rules = await db.query<any>(
      `SELECT r.*, 
              s_offer.name as offer_service_name
       FROM upsell_rules r
       JOIN services s_offer ON r.offer_service_id = s_offer.id
       WHERE r.professional_id = ? AND r.is_active = 1`,
      [professionalId]
    );

    if (!rules.length) return [];

    // 2. Iterate rules and check for matching upcoming bookings
    for (const rule of rules) {
      // Look for bookings scheduled exactly `days_before_appointment` from now
      // This query uses a simplistic date diff (ignoring hours for daily crons).
      // We look for pending or confirmed bookings where the client hasn't already been upsold to for this booking.
      
      const eligibleBookings = await db.query<any>(
        `SELECT b.id as booking_id, b.client_id, b.start_time, 
                c.phone as client_phone, c.name as client_name,
                s_trigger.name as trigger_service_name
         FROM bookings b
         JOIN clients c ON b.client_id = c.id
         JOIN services s_trigger ON b.service_id = s_trigger.id
         WHERE b.professional_id = ? 
         AND b.service_id = ?
         AND b.status IN ('pending', 'confirmed')
         AND DATE(b.start_time) = DATE(DATE_ADD(NOW(), INTERVAL ? DAY))
         -- Ensure we haven't already sent an upsell for this specific booking + rule
         AND NOT EXISTS (
           SELECT 1 FROM upsell_recipients ur 
           WHERE ur.booking_id = b.id AND ur.rule_id = ?
         )
         -- Ensure the client doesn't already have the offer service scheduled on the same day
         AND NOT EXISTS (
           SELECT 1 FROM bookings b_offer 
           WHERE b_offer.client_id = b.client_id 
           AND b_offer.service_id = ? 
           AND DATE(b_offer.start_time) = DATE(b.start_time)
           AND b_offer.status != 'cancelled'
         )`,
        [
          professionalId, 
          rule.trigger_service_id, 
          rule.days_before_appointment, 
          rule.id, 
          rule.offer_service_id
        ]
      );

      for (const booking of eligibleBookings) {
        if (!booking.client_phone) continue;
        
        opportunities.push({
          rule_id: rule.id,
          professional_id: professionalId,
          client_id: booking.client_id,
          booking_id: booking.booking_id,
          trigger_service_name: booking.trigger_service_name,
          offer_service_name: rule.offer_service_name,
          discount_percentage: Number(rule.discount_percentage),
          message_template: rule.message_template,
          client_phone: booking.client_phone,
          client_name: booking.client_name
        });
      }
    }

    return opportunities;
  }
}
