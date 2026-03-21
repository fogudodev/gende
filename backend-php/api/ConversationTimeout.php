<?php
/**
 * Conversation Timeout (cron)
 * Replaces: supabase/functions/conversation-timeout/index.ts
 * Run via crontab: * * * * * php /path/to/backend-php/cron/conversation-timeout.php
 */

namespace Api;

use Core\Database;
use Core\Response;

class ConversationTimeout
{
    public function run(): void
    {
        $db = Database::getInstance();
        $whatsapp = new WhatsApp();

        $thirtyMinAgo = date('Y-m-d H:i:s', strtotime('-30 minutes'));
        $stmt = $db->prepare("SELECT id, professional_id, client_phone, context, messages FROM whatsapp_conversations WHERE status = 'active' AND updated_at < ?");
        $stmt->execute([$thirtyMinAgo]);
        $staleConvs = $stmt->fetchAll();

        $closed = 0;
        foreach ($staleConvs as $conv) {
            $stmt = $db->prepare("SELECT instance_name, status FROM whatsapp_instances WHERE professional_id = ? AND status = 'connected' LIMIT 1");
            $stmt->execute([$conv['professional_id']]);
            $inst = $stmt->fetch();

            if ($inst) {
                $context = json_decode($conv['context'] ?? '{}', true);
                $clientName = $context['client_name'] ?? 'Cliente';

                $stmt = $db->prepare('SELECT business_name, name, slug FROM professionals WHERE id = ?');
                $stmt->execute([$conv['professional_id']]);
                $prof = $stmt->fetch();
                $bookingLink = $prof['slug'] ? "https://gende.io/{$prof['slug']}" : '';

                $timeoutMsg = "⏰ Olá" . ($clientName !== 'Cliente' ? " {$clientName}" : '') . "! Sua conversa foi encerrada por inatividade.\n\nSe ainda quiser agendar, é só nos enviar uma nova mensagem! 😊" . ($bookingLink ? "\n\n📱 Ou agende online: {$bookingLink}" : '');

                $whatsapp->sendMessage($inst['instance_name'], $conv['client_phone'], $timeoutMsg);
            }

            $msgs = json_decode($conv['messages'] ?? '[]', true) ?: [];
            $msgs[] = ['role' => 'system', 'content' => 'Conversa encerrada por inatividade (30 min)'];
            $stmt = $db->prepare("UPDATE whatsapp_conversations SET status = 'expired', messages = ? WHERE id = ?");
            $stmt->execute([json_encode($msgs), $conv['id']]);
            $closed++;
        }

        Response::success(['success' => true, 'closed' => $closed]);
    }
}
