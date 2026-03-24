import { db } from '../core/database.js';
import { WhatsAppService } from '../services/whatsapp.js';
import { ReactivationEligibilityService } from '../services/ReactivationEligibilityService.js';
import { ReactivationScoringService } from '../services/ReactivationScoringService.js';

const wa = new WhatsAppService();

export class CampaignExecutionWorker {
  /**
   * Executes a specific campaign for a professional
   */
  public static async executeCampaign(campaignId: string, professionalId: string): Promise<{ success: boolean; processed: number; errors: any[] }> {
    // 1. Get Campaign
    const campaign = await db.queryOne<any>(
      'SELECT * FROM reactivation_campaigns WHERE id = ? AND professional_id = ?',
      [campaignId, professionalId]
    );

    if (!campaign || campaign.status !== 'active') {
      throw new Error('Campaign not found or not active');
    }

    // 2. Get Professional WhatsApp Instance
    const inst = await db.queryOne<any>(
      "SELECT instance_name, status FROM whatsapp_instances WHERE professional_id = ? AND status = 'connected' LIMIT 1",
      [professionalId]
    );

    if (!inst) {
      throw new Error('WhatsApp instance not connected');
    }

    // 3. Find Eligible Customers
    // For V1, we fetch all clients that have at least one past booking, then test eligibility.
    // In production, this should be optimized with a materialized view or complex query.
    const clients = await db.query<any>(`
      SELECT c.id, c.name, c.phone, c.last_completed_appointment_at, c.avg_return_interval_days
      FROM clients c
      WHERE c.professional_id = ?
    `, [professionalId]);

    let processedCount = 0;
    const errors: any[] = [];

    for (const client of clients) {
      if (!client.phone) continue;

      // Check if already sent in this campaign
      const alreadySent = await db.queryOne<any>(
        'SELECT id FROM reactivation_campaign_recipients WHERE campaign_id = ? AND client_id = ?',
        [campaignId, client.id]
      );
      if (alreadySent) continue;

      const isEligible = await ReactivationEligibilityService.isEligible({
        clientId: client.id,
        professionalId,
        lastCompletedAppointmentAt: client.last_completed_appointment_at,
        avgReturnIntervalDays: client.avg_return_interval_days
      });

      if (!isEligible) continue;

      // Generate Message
      const vars = {
        name: client.name || 'Cliente',
        // In the future: booking_link, etc.
      };
      
      const finalMessage = WhatsAppService.replaceVars(campaign.message_template, vars);

      // Send Message
      try {
        const sendRes = await wa.sendMessage(inst.instance_name, client.phone, finalMessage);
        
        const status = sendRes.ok ? 'sent' : 'failed';
        
        // Log Recipient
        const recipientId = db.uuid();
        await db.execute(
          `INSERT INTO reactivation_campaign_recipients (id, campaign_id, client_id, message_payload, status, sent_at)
           VALUES (?, ?, ?, ?, ?, NOW())`,
          [recipientId, campaignId, client.id, finalMessage, status]
        );

        // Log Event
        await db.execute(
          `INSERT INTO reactivation_events (id, client_id, campaign_id, event_type)
           VALUES (?, ?, ?, ?)`,
          [db.uuid(), client.id, campaignId, status === 'sent' ? 'message_sent' : 'message_failed']
        );

        if (status === 'sent') processedCount++;
      } catch (err: any) {
        errors.push({ clientId: client.id, error: err.message });
      }

      // Respect send limits if configured (could check count and break early)
      if (campaign.send_limit_per_day && processedCount >= campaign.send_limit_per_day) {
        break;
      }
    }

    // Auto-complete campaign if no limits and we processed all
    if (!campaign.send_limit_per_day) {
        await db.execute('UPDATE reactivation_campaigns SET status = ? WHERE id = ?', ['completed', campaignId]);
    }

    return { success: true, processed: processedCount, errors };
  }
}
