import { db } from '../core/database.js';
import { WhatsAppService } from '../services/whatsapp.js';

const wa = new WhatsAppService();

export class UpsellExecutionWorker {
  /**
   * Evaluates all recipients of an upsell campaign and dispatches the templated message
   */
  public static async executeCampaign(professionalId: string, campaignId: string): Promise<{ success: boolean; processed: number; errors: any[] }> {
    // 1. Ensure WhatsApp is connected
    const inst = await db.queryOne<any>(
      "SELECT instance_name, status FROM whatsapp_instances WHERE professional_id = ? AND status = 'connected' LIMIT 1",
      [professionalId]
    );

    if (!inst) throw new Error('WhatsApp instance not connected. Please connect your phone in settings.');

    // 2. Load Campaign
    const campaign = await db.queryOne<any>(
      "SELECT * FROM upsell_campaigns WHERE id = ? AND professional_id = ?",
      [campaignId, professionalId]
    );
    if (!campaign) throw new Error('Campaign not found');

    // 3. Load Recipients and their Opportunities
    const recipients = await db.query<any>(
      `SELECT r.*, c.phone, c.name, s.name as suggested_service_name, s.price as suggested_price
       FROM upsell_campaign_recipients r
       JOIN clients c ON r.client_id = c.id
       JOIN upsell_opportunities o ON r.opportunity_id = o.id
       JOIN services s ON o.suggested_service_id = s.id
       WHERE r.campaign_id = ? AND r.status = 'pending'`,
      [campaignId]
    );

    let processedCount = 0;
    const errors: any[] = [];

    // Mark running
    await db.execute("UPDATE upsell_campaigns SET status = 'running', executed_at = NOW() WHERE id = ?", [campaignId]);

    for (const r of recipients) {
      if (!r.phone) {
        await db.execute("UPDATE upsell_campaign_recipients SET status = 'failed' WHERE id = ?", [r.id]);
        continue;
      }

      // Format variables
      const vars = {
        name: r.name || 'Cliente',
        suggested_service: r.suggested_service_name,
        price: r.suggested_price || ''
      };

      const finalMessage = WhatsAppService.replaceVars(campaign.message_template || '', vars);

      // Send Message
      try {
        const sendRes = await wa.sendMessage(inst.instance_name, r.phone, finalMessage);
        const status = sendRes.ok ? 'sent' : 'failed';
        
        await db.execute(
          "UPDATE upsell_campaign_recipients SET status = ?, sent_at = NOW() WHERE id = ?",
          [status, r.id]
        );
        if (status === 'sent') processedCount++;
      } catch (err: any) {
        errors.push({ clientId: r.client_id, error: err.message });
        await db.execute("UPDATE upsell_campaign_recipients SET status = 'failed' WHERE id = ?", [r.id]);
      }
    }

    // Mark Complete
    await db.execute("UPDATE upsell_campaigns SET status = 'completed' WHERE id = ?", [campaignId]);

    return { success: true, processed: processedCount, errors };
  }
}
