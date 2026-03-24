import { Router, Request, Response } from 'express';
import { db } from '../core/database.js';
import { authMiddleware, getProfessionalId, JwtPayload } from '../core/auth.js';
import { CampaignService } from '../services/CampaignService.js';
import { CampaignExecutionWorker } from '../workers/CampaignExecutionWorker.js';
import { ReactivationScoringService } from '../services/ReactivationScoringService.js';

const router = Router();

// GET Eligible Customers with their calculated scores
router.get('/reactivation/customers/analyze', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as JwtPayload;
    const profId = await getProfessionalId(user.sub);
    if (!profId) return res.status(403).json({ error: 'Professional ID required' });

    const clients = await db.query<any>(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM bookings b WHERE b.client_id = c.id AND b.status = 'completed') as appointments_count,
        DATEDIFF(NOW(), c.last_completed_appointment_at) as days_since_last_visit
      FROM clients c
      WHERE c.professional_id = ?
    `, [profId]);

    const analyzed = clients.map(client => {
      // Calculate missing data dynamically for scoring
      const scoreData = ReactivationScoringService.calculateScore({
        daysSinceLastVisit: client.days_since_last_visit || 0,
        appointmentsCount: client.appointments_count || 0,
        averageTicket: client.average_ticket || 0,
        avgReturnIntervalDays: client.avg_return_interval_days || 30
      });

      return {
        ...client,
        reactivation_score: scoreData.score,
        reactivation_status: scoreData.status
      };
    }).sort((a, b) => b.reactivation_score - a.reactivation_score);

    res.json(analyzed);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to analyze customers', details: err.message });
  }
});

// POST Create Campaign
router.post('/reactivation/campaigns', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as JwtPayload;
    const profId = await getProfessionalId(user.sub);
    if (!profId) return res.status(403).json({ error: 'Professional ID required' });

    const campaignId = await CampaignService.createCampaign({
      professionalId: profId,
      ...req.body
    });

    res.json({ id: campaignId });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create campaign', details: err.message });
  }
});

// POST Execute Campaign
router.post('/reactivation/campaigns/:id/execute', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as JwtPayload;
    const profId = await getProfessionalId(user.sub);
    if (!profId) return res.status(403).json({ error: 'Professional ID required' });
    const { id } = req.params;

    // Set status to active
    await CampaignService.updateStatus(id, 'active');

    // Run execution worker
    const result = await CampaignExecutionWorker.executeCampaign(id, profId);

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to execute campaign', details: err.message });
  }
});

// GET Dashboard Metrics
router.get('/reactivation/metrics', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as JwtPayload;
    const profId = await getProfessionalId(user.sub);
    if (!profId) return res.status(403).json({ error: 'Professional ID required' });

    // Basic metrics aggregation
    const [stats] = await db.query<any>(`
      SELECT 
        (SELECT COUNT(*) FROM clients WHERE professional_id = ?) as total_clients,
        (SELECT COUNT(*) FROM reactivation_campaigns WHERE professional_id = ?) as total_campaigns,
        (SELECT COUNT(*) FROM reactivation_events e JOIN reactivation_campaigns c ON e.campaign_id = c.id WHERE c.professional_id = ? AND e.event_type = 'message_sent') as total_messages_sent,
        COALESCE((SELECT SUM(value) FROM reactivation_events e JOIN reactivation_campaigns c ON e.campaign_id = c.id WHERE c.professional_id = ? AND e.event_type = 'completed'), 0) as recovered_revenue
    `, [profId, profId, profId, profId]);

    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load metrics', details: err.message });
  }
});

export default router;
