<?php
/**
 * Send Reminders (cron job)
 * Replaces: supabase/functions/send-reminders/index.ts
 * Run via crontab: */5 * * * * php /path/to/backend-php/cron/reminders.php
 */

namespace Api;

use Core\Database;
use Core\Response;

class Reminders
{
    private \PDO $db;
    private WhatsApp $whatsapp;

    public function __construct()
    {
        $this->db = Database::getInstance();
        $this->whatsapp = new WhatsApp();
    }

    public function run(): void
    {
        $now = new \DateTime('now', new \DateTimeZone('America/Sao_Paulo'));
        $results = [];

        // 24h reminders
        $h24Start = (clone $now)->modify('+23 hours')->format('c');
        $h24End = (clone $now)->modify('+25 hours')->format('c');

        // 3h reminders  
        $h3Start = (clone $now)->modify('+150 minutes')->format('c');
        $h3End = (clone $now)->modify('+210 minutes')->format('c');

        // Post-sale review (completed 23-25h ago)
        $psStart = (clone $now)->modify('-25 hours')->format('c');
        $psEnd = (clone $now)->modify('-23 hours')->format('c');

        $allBookings = [];

        // 24h
        $stmt = $this->db->prepare("SELECT b.*, s.name as service_name FROM bookings b LEFT JOIN services s ON s.id = b.service_id WHERE b.status IN ('pending','confirmed') AND b.start_time >= ? AND b.start_time <= ? AND b.client_phone IS NOT NULL");
        $stmt->execute([$h24Start, $h24End]);
        foreach ($stmt->fetchAll() as $b) { $b['triggerType'] = 'reminder_24h'; $allBookings[] = $b; }

        // 3h
        $stmt = $this->db->prepare("SELECT b.*, s.name as service_name FROM bookings b LEFT JOIN services s ON s.id = b.service_id WHERE b.status IN ('pending','confirmed') AND b.start_time >= ? AND b.start_time <= ? AND b.client_phone IS NOT NULL");
        $stmt->execute([$h3Start, $h3End]);
        foreach ($stmt->fetchAll() as $b) { $b['triggerType'] = 'reminder_3h'; $allBookings[] = $b; }

        // Post-sale review
        $stmt = $this->db->prepare("SELECT b.*, s.name as service_name FROM bookings b LEFT JOIN services s ON s.id = b.service_id WHERE b.status = 'completed' AND b.updated_at >= ? AND b.updated_at <= ? AND b.client_phone IS NOT NULL");
        $stmt->execute([$psStart, $psEnd]);
        foreach ($stmt->fetchAll() as $b) { $b['triggerType'] = 'post_sale_review'; $allBookings[] = $b; }

        // Group by professional
        $byProf = [];
        foreach ($allBookings as $b) {
            $byProf[$b['professional_id']][] = $b;
        }

        foreach ($byProf as $profId => $bookings) {
            $stmt = $this->db->prepare('SELECT id, slug, reminder_message, business_name, name FROM professionals WHERE id = ?');
            $stmt->execute([$profId]);
            $prof = $stmt->fetch();
            if (!$prof) continue;

            $stmt = $this->db->prepare("SELECT instance_name, status FROM whatsapp_instances WHERE professional_id = ? LIMIT 1");
            $stmt->execute([$profId]);
            $inst = $stmt->fetch();
            if (!$inst || $inst['status'] !== 'connected') continue;

            $stmt = $this->db->prepare("SELECT * FROM whatsapp_automations WHERE professional_id = ? AND automation_type IN ('reminder_24h','reminder_3h','post_sale_review','maintenance_reminder') AND is_enabled = 1");
            $stmt->execute([$profId]);
            $automations = [];
            foreach ($stmt->fetchAll() as $a) { $automations[$a['automation_type']] = $a; }
...
                $messageTemplate = $automation['custom_message'];
                if (in_array($booking['triggerType'], ['reminder_24h', 'reminder_3h']) && $prof['reminder_message']) {
                    $messageTemplate = $prof['reminder_message'];
                } elseif ($booking['triggerType'] === 'post_sale_review' && (!$messageTemplate || trim($messageTemplate) === '')) {
                    $messageTemplate = "Olá {nome}! Como foi seu atendimento de {servico}? ⭐ Avalie: {link_avaliacao}\n\nSua opinião é muito importante! 😊";
                }

                $finalMessage = WhatsApp::replaceVars($messageTemplate, [
                    'nome' => $booking['client_name'] ?? 'Cliente',
                    'servico' => $booking['service_name'] ?? 'serviço',
                    'data' => $startDate->format('d/m/Y'),
                    'horario' => $startDate->format('H:i'),
                    'link' => $bookingLink,
                    'link_avaliacao' => $reviewLink,
                ]);

                $res = $this->whatsapp->sendMessage($inst['instance_name'], $booking['client_phone'], $finalMessage);

                $stmt = $this->db->prepare('INSERT INTO whatsapp_logs (id, professional_id, automation_id, booking_id, recipient_phone, message_content, status, sent_at, error_message) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
                $stmt->execute([
                    Database::uuid(), $profId, $automation['id'], $booking['id'],
                    $booking['client_phone'], $finalMessage,
                    $res['ok'] ? 'sent' : 'failed',
                    $res['ok'] ? date('c') : null,
                    $res['ok'] ? null : json_encode($res['data']),
                ]);

                $results[] = ['type' => $booking['triggerType'], 'bookingId' => $booking['id'], 'success' => $res['ok']];
            }
        }

        Response::success(['success' => true, 'processed' => count($results), 'results' => $results]);
    }
}
