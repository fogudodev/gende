import { db } from '../core/database.js';

export class CampaignService {
  /**
   * Create a new reactivation campaign.
   */
  public static async createCampaign(data: {
    professionalId: string;
    name: string;
    segmentFilter?: any;
    messageTemplate: string;
    sendLimitPerDay?: number;
    scheduledAt?: Date;
  }): Promise<string> {
    const id = db.uuid();
    await db.execute(
      `INSERT INTO reactivation_campaigns 
      (id, professional_id, name, segment_filter, message_template, send_limit_per_day, scheduled_at, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'draft')`,
      [
        id,
        data.professionalId,
        data.name,
        data.segmentFilter ? JSON.stringify(data.segmentFilter) : null,
        data.messageTemplate,
        data.sendLimitPerDay || null,
        data.scheduledAt || null
      ]
    );
    return id;
  }

  /**
   * Updates campaign status
   */
  public static async updateStatus(campaignId: string, status: 'draft' | 'active' | 'completed' | 'paused'): Promise<void> {
    await db.execute('UPDATE reactivation_campaigns SET status = ?, updated_at = NOW() WHERE id = ?', [status, campaignId]);
  }

  /**
   * Get campaign details
   */
  public static async getCampaign(campaignId: string, professionalId: string) {
    return db.queryOne('SELECT * FROM reactivation_campaigns WHERE id = ? AND professional_id = ?', [campaignId, professionalId]);
  }
}
