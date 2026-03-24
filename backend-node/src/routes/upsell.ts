import { Router, Request, Response } from 'express';
import { db } from '../core/database.js';
import { authMiddleware, getProfessionalId, JwtPayload } from '../core/auth.js';
import { UpsellOpportunityService } from '../services/UpsellOpportunityService.js';
import { UpsellExecutionWorker } from '../workers/UpsellExecutionWorker.js';

const router = Router();

// GET Upsell Opportunities
router.get('/upsell/opportunities', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as JwtPayload;
    const profId = await getProfessionalId(user.sub);
    if (!profId) return res.status(403).json({ error: 'Professional not found' });

    const rows = await db.query<any>(`
      SELECT o.*, c.name as client_name, c.phone as client_phone, s.name as suggested_service_name, s.price as suggested_price
      FROM upsell_opportunities o
      JOIN clients c ON o.client_id = c.id
      JOIN services s ON o.suggested_service_id = s.id
      WHERE o.professional_id = ? AND o.status = 'pending'
      ORDER BY o.score DESC
    `, [profId]);

    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load opportunities', details: err.message });
  }
});

// POST Trigger Mapper Manually
router.post('/upsell/opportunities/trigger', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as JwtPayload;
    const profId = await getProfessionalId(user.sub);
    if (!profId) return res.status(403).json({ error: 'Professional not found' });
    const result = await UpsellOpportunityService.generateOpportunities(profId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate opportunities', details: err.message });
  }
});

// GET Campaigns
router.get('/upsell/campaigns', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as JwtPayload;
    const profId = await getProfessionalId(user.sub);
    if (!profId) return res.status(403).json({ error: 'Professional not found' });

    const rows = await db.query<any>(`
      SELECT * FROM upsell_campaigns WHERE professional_id = ? ORDER BY created_at DESC
    `, [profId]);
    res.json(rows);
  } catch(err: any) { res.status(500).json({ error: err.message }); }
});

// POST Create Campaign 
router.post('/upsell/campaigns', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as JwtPayload;
    const profId = await getProfessionalId(user.sub);
    if (!profId) return res.status(403).json({ error: 'Professional not found' });
    const { name, message_template, opportunityIds } = req.body;
    
    // Create Campaign
    const campaignId = db.uuid();
    await db.execute(
      "INSERT INTO upsell_campaigns (id, professional_id, name, message_template, status) VALUES (?, ?, ?, ?, 'draft')",
      [campaignId, profId, name, message_template]
    );

    // Link opportunities as recipients
    for (const oppId of opportunityIds) {
      const opp = await db.queryOne<any>("SELECT client_id FROM upsell_opportunities WHERE id = ?", [oppId]);
      if (opp) {
        await db.execute(
          "INSERT INTO upsell_campaign_recipients (id, campaign_id, client_id, opportunity_id) VALUES (?, ?, ?, ?)",
          [db.uuid(), campaignId, opp.client_id, oppId]
        );
        // Mark opp as processing or similar so it doesn't get picked up again immediately
        await db.execute("UPDATE upsell_opportunities SET status = 'in_campaign' WHERE id = ?", [oppId]);
      }
    }

    res.json({ id: campaignId });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST Execute Campaign
router.post('/upsell/campaigns/:id/execute', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as JwtPayload;
    const profId = await getProfessionalId(user.sub);
    if (!profId) return res.status(403).json({ error: 'Professional not found' });
    const result = await UpsellExecutionWorker.executeCampaign(profId, req.params.id);
    res.json(result);
  } catch(err: any) { res.status(500).json({ error: err.message }); }
});

// GET Dash Metrics
router.get('/upsell/metrics', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as JwtPayload;
    const profId = await getProfessionalId(user.sub);
    if (!profId) return res.status(403).json({ error: 'Professional not found' });

    const [stats] = await db.query<any>(`
      SELECT 
        (SELECT COUNT(*) FROM upsell_opportunities WHERE professional_id = ? AND status = 'pending') as active_opportunities,
        (SELECT COUNT(*) FROM upsell_campaign_recipients WHERE status IN ('sent', 'delivered') AND campaign_id IN (SELECT id FROM upsell_campaigns WHERE professional_id = ?)) as total_offers_sent,
        COALESCE((SELECT COUNT(*) FROM upsell_events WHERE professional_id = ? AND event_type = 'completed'), 0) as successful_upsells,
        COALESCE((SELECT SUM(incremental_revenue) FROM upsell_events WHERE professional_id = ? AND event_type = 'completed'), 0) as incremental_revenue
    `, [profId, profId, profId, profId]);

    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load metrics', details: err.message });
  }
});

export default router;
