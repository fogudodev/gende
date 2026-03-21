<?php
/**
 * Campaign Management
 * Replaces: supabase/functions/send-campaign/index.ts
 */

namespace Api;

use Core\Auth;
use Core\Database;
use Core\Response;

class Campaigns
{
    private \PDO $db;
    private WhatsApp $whatsapp;

    public function __construct()
    {
        $this->db = Database::getInstance();
        $this->whatsapp = new WhatsApp();
    }

    public function handleAction(array $data): void
    {
        $action = $data['action'] ?? '';
        match ($action) {
            'create-campaign' => $this->createCampaign($data),
            'get-limits' => $this->getLimits($data),
            default => Response::error("Unknown action: {$action}"),
        };
    }

    private function createCampaign(array $data): void
    {
        $profId = $data['professionalId'];
        $name = $data['name'];
        $message = $data['message'];
        $clientIds = $data['clientIds'] ?? [];

        // Check plan limits
        $stmt = $this->db->prepare('SELECT plan_id FROM subscriptions WHERE professional_id = ? ORDER BY created_at DESC LIMIT 1');
        $stmt->execute([$profId]);
        $planId = ($stmt->fetch()['plan_id'] ?? 'free');

        $stmt = $this->db->prepare('SELECT * FROM plan_limits WHERE plan_id = ?');
        $stmt->execute([$planId]);
        $limits = $stmt->fetch();
        if (!$limits) { Response::error('Limites do plano não encontrados'); return; }

        $stmt = $this->db->prepare('SELECT * FROM professional_limits WHERE professional_id = ?');
        $stmt->execute([$profId]);
        $profLimits = $stmt->fetch();
        $extraCampaigns = $profLimits['extra_campaigns_purchased'] ?? 0;
        $extraContacts = $profLimits['extra_contacts_purchased'] ?? 0;

        $today = date('Y-m-d');
        $stmt = $this->db->prepare('SELECT * FROM daily_message_usage WHERE professional_id = ? AND usage_date = ?');
        $stmt->execute([$profId, $today]);
        $usage = $stmt->fetch();
        $campaignsSent = $usage['campaigns_sent'] ?? 0;

        $effectiveDaily = $limits['daily_campaigns'] == -1 ? -1 : $limits['daily_campaigns'] + $extraCampaigns;
        if ($effectiveDaily !== -1 && $campaignsSent >= $effectiveDaily) {
            Response::success(['success' => false, 'error' => "Limite diário de campanhas atingido ({$effectiveDaily}/dia)"]);
            return;
        }

        // Get clients
        if (!empty($clientIds)) {
            $placeholders = implode(',', array_fill(0, count($clientIds), '?'));
            $stmt = $this->db->prepare("SELECT id, name, phone FROM clients WHERE professional_id = ? AND id IN ({$placeholders}) AND phone IS NOT NULL");
            $stmt->execute(array_merge([$profId], $clientIds));
        } else {
            $stmt = $this->db->prepare("SELECT id, name, phone FROM clients WHERE professional_id = ? AND phone IS NOT NULL AND phone != ''");
            $stmt->execute([$profId]);
        }
        $clients = $stmt->fetchAll();
        if (!$clients) { Response::success(['success' => false, 'error' => 'Nenhum cliente com telefone']); return; }

        $maxContacts = $limits['campaign_max_contacts'] == -1 ? -1 : $limits['campaign_max_contacts'] + $extraContacts;
        if ($maxContacts !== -1 && count($clients) > $maxContacts) $clients = array_slice($clients, 0, $maxContacts);

        // Create campaign
        $campaignId = Database::uuid();
        $stmt = $this->db->prepare("INSERT INTO campaigns (id, professional_id, name, message, status, target_type, total_contacts, started_at) VALUES (?, ?, ?, ?, 'sending', ?, ?, NOW())");
        $stmt->execute([$campaignId, $profId, $name, $message, !empty($clientIds) ? 'selected' : 'all_clients', count($clients)]);

        // Insert contacts
        foreach ($clients as $c) {
            $stmt = $this->db->prepare("INSERT INTO campaign_contacts (id, campaign_id, client_id, phone, client_name, status) VALUES (?, ?, ?, ?, ?, 'pending')");
            $stmt->execute([Database::uuid(), $campaignId, $c['id'], $c['phone'], $c['name']]);
        }

        // Get instance
        $stmt = $this->db->prepare("SELECT instance_name, status FROM whatsapp_instances WHERE professional_id = ? LIMIT 1");
        $stmt->execute([$profId]);
        $inst = $stmt->fetch();
        if (!$inst || $inst['status'] !== 'connected') {
            $this->db->prepare("UPDATE campaigns SET status = 'failed' WHERE id = ?")->execute([$campaignId]);
            Response::success(['success' => false, 'error' => 'WhatsApp não conectado']);
            return;
        }

        $stmt = $this->db->prepare('SELECT slug, name, business_name FROM professionals WHERE id = ?');
        $stmt->execute([$profId]);
        $prof = $stmt->fetch();

        $sentCount = 0; $failedCount = 0;
        foreach ($clients as $contact) {
            $finalMessage = WhatsApp::replaceVars($message, [
                'nome' => $contact['name'] ?? 'Cliente',
                'link' => $prof['slug'] ? "https://gende.io/{$prof['slug']}" : '',
                'negocio' => $prof['business_name'] ?: ($prof['name'] ?? ''),
            ]);

            $res = $this->whatsapp->sendMessage($inst['instance_name'], $contact['phone'], $finalMessage);
            if ($res['ok']) {
                $sentCount++;
                $this->db->prepare("UPDATE campaign_contacts SET status = 'sent', sent_at = NOW() WHERE campaign_id = ? AND phone = ?")->execute([$campaignId, $contact['phone']]);
            } else {
                $failedCount++;
                $this->db->prepare("UPDATE campaign_contacts SET status = 'failed', error_message = ? WHERE campaign_id = ? AND phone = ?")->execute([json_encode($res['data']), $campaignId, $contact['phone']]);
            }
            usleep(1000000); // 1s delay
        }

        $this->db->prepare("UPDATE campaigns SET status = 'completed', sent_count = ?, failed_count = ?, completed_at = NOW() WHERE id = ?")->execute([$sentCount, $failedCount, $campaignId]);

        // Update usage
        $stmt = $this->db->prepare("INSERT INTO daily_message_usage (id, professional_id, usage_date, campaigns_sent, reminders_sent) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE campaigns_sent = ?");
        $stmt->execute([Database::uuid(), $profId, $today, $campaignsSent + 1, $usage['reminders_sent'] ?? 0, $campaignsSent + 1]);

        Response::success(['success' => true, 'campaignId' => $campaignId, 'sent' => $sentCount, 'failed' => $failedCount, 'total' => count($clients)]);
    }

    private function getLimits(array $data): void
    {
        $profId = $data['professionalId'];
        $stmt = $this->db->prepare('SELECT plan_id FROM subscriptions WHERE professional_id = ? ORDER BY created_at DESC LIMIT 1');
        $stmt->execute([$profId]);
        $planId = $stmt->fetch()['plan_id'] ?? 'free';

        $stmt = $this->db->prepare('SELECT * FROM plan_limits WHERE plan_id = ?');
        $stmt->execute([$planId]);
        $limits = $stmt->fetch() ?: ['daily_reminders' => 5, 'daily_campaigns' => 0, 'campaign_max_contacts' => 0, 'campaign_min_interval_hours' => 6];

        $today = date('Y-m-d');
        $stmt = $this->db->prepare('SELECT * FROM daily_message_usage WHERE professional_id = ? AND usage_date = ?');
        $stmt->execute([$profId, $today]);
        $usage = $stmt->fetch();

        $stmt = $this->db->prepare('SELECT * FROM professional_limits WHERE professional_id = ?');
        $stmt->execute([$profId]);
        $profLimits = $stmt->fetch();

        Response::success([
            'planId' => $planId,
            'limits' => $limits,
            'extras' => [
                'extra_reminders' => $profLimits['extra_reminders_purchased'] ?? 0,
                'extra_campaigns' => $profLimits['extra_campaigns_purchased'] ?? 0,
                'extra_contacts' => $profLimits['extra_contacts_purchased'] ?? 0,
            ],
            'usage' => ['reminders_sent' => $usage['reminders_sent'] ?? 0, 'campaigns_sent' => $usage['campaigns_sent'] ?? 0],
        ]);
    }
}
