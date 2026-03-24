<?php
/**
 * WhatsApp Integration API (Evolution API + Meta Cloud Fallback)
 * Replaces: supabase/functions/whatsapp/index.ts
 */

namespace Api;

use Core\Auth;
use Core\Database;
use Core\Response;

class WhatsApp
{
    private \PDO $db;
    private string $evolutionUrl;
    private string $evolutionKey;
    private string $metaToken;
    private string $metaPhoneId;
    private string $metaApiVersion;

    public function __construct()
    {
        $this->db = Database::getInstance();
        $config = require __DIR__ . '/../config/app.php';
        $this->evolutionUrl = $config['evolution_api_url'] ?? '';
        $this->evolutionKey = $config['evolution_api_key'] ?? '';
        $this->metaToken = $config['meta_whatsapp_token'] ?? '';
        $this->metaPhoneId = $config['meta_whatsapp_phone_id'] ?? '';
        $this->metaApiVersion = $config['meta_api_version'] ?? 'v21.0';
    }

    public static function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/\D/', '', $phone);
        if (str_starts_with($digits, '55') && strlen($digits) >= 12 && strlen($digits) <= 13) return $digits;
        if (strlen($digits) >= 10 && strlen($digits) <= 11) return '55' . $digits;
        return $digits;
    }

    public static function replaceVars(string $template, array $vars): string
    {
        foreach ($vars as $key => $value) {
            $template = str_replace('{' . $key . '}', $value ?? '', $template);
        }
        return $template;
    }

    private function evolutionRequest(string $endpoint, string $method = 'GET', ?array $body = null): array
    {
        $ch = curl_init($this->evolutionUrl . $endpoint);
        $headers = ['Content-Type: application/json', 'apikey: ' . $this->evolutionKey];
        $opts = [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_TIMEOUT => 15,
        ];
        if ($method === 'POST') {
            $opts[CURLOPT_POST] = true;
            if ($body) $opts[CURLOPT_POSTFIELDS] = json_encode($body);
        }
        curl_setopt_array($ch, $opts);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        return ['data' => json_decode($response, true) ?? [], 'status' => $httpCode, 'ok' => $httpCode >= 200 && $httpCode < 300];
    }

    /**
     * Send message with automatic fallback: Evolution API → Meta Cloud API
     */
    public function sendMessage(string $instanceName, string $phone, string $message): array
    {
        $normalizedPhone = self::normalizePhone($phone);

        // 1) Try Evolution API first
        $res = $this->evolutionRequest("/message/sendText/{$instanceName}", 'POST', [
            'number' => $normalizedPhone,
            'text' => $message,
        ]);

        if ($res['ok']) {
            $res['provider'] = 'evolution';
            return $res;
        }

        // 2) Fallback to Meta Cloud API
        $metaRes = $this->sendViaMeta($normalizedPhone, $message);
        $metaRes['fallback'] = true;
        $metaRes['evolution_error'] = $res['data'];
        return $metaRes;
    }

    /**
     * Send a text message via Meta Cloud API (WhatsApp Business)
     */
    private function sendViaMeta(string $phone, string $message): array
    {
        if (!$this->metaToken || !$this->metaPhoneId) {
            return ['data' => ['error' => 'Meta Cloud API not configured'], 'status' => 500, 'ok' => false, 'provider' => 'meta'];
        }

        $url = "https://graph.facebook.com/{$this->metaApiVersion}/{$this->metaPhoneId}/messages";

        $body = [
            'messaging_product' => 'whatsapp',
            'recipient_type' => 'individual',
            'to' => $phone,
            'type' => 'text',
            'text' => ['preview_url' => true, 'body' => $message],
        ];

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($body),
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $this->metaToken,
            ],
            CURLOPT_TIMEOUT => 15,
        ]);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $data = json_decode($response, true) ?? [];
        return [
            'data' => $data,
            'status' => $httpCode,
            'ok' => $httpCode >= 200 && $httpCode < 300,
            'provider' => 'meta',
        ];
    }

    /**
     * Send a template message via Meta Cloud API (required for first contact / 24h+ window)
     */
    public function sendMetaTemplate(string $phone, string $templateName, string $languageCode = 'pt_BR', array $parameters = []): array
    {
        if (!$this->metaToken || !$this->metaPhoneId) {
            return ['data' => ['error' => 'Meta Cloud API not configured'], 'status' => 500, 'ok' => false, 'provider' => 'meta'];
        }

        $url = "https://graph.facebook.com/{$this->metaApiVersion}/{$this->metaPhoneId}/messages";

        $components = [];
        if (!empty($parameters)) {
            $params = array_map(fn($v) => ['type' => 'text', 'text' => (string)$v], $parameters);
            $components[] = ['type' => 'body', 'parameters' => $params];
        }

        $body = [
            'messaging_product' => 'whatsapp',
            'to' => self::normalizePhone($phone),
            'type' => 'template',
            'template' => [
                'name' => $templateName,
                'language' => ['code' => $languageCode],
                'components' => $components,
            ],
        ];

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($body),
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $this->metaToken,
            ],
            CURLOPT_TIMEOUT => 15,
        ]);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $data = json_decode($response, true) ?? [];
        return [
            'data' => $data,
            'status' => $httpCode,
            'ok' => $httpCode >= 200 && $httpCode < 300,
            'provider' => 'meta',
        ];
    }

    public function handleAction(array $data): void
    {
        $action = $data['action'] ?? '';

        switch ($action) {
            case 'create-instance':
                $this->createInstance($data);
                break;
            case 'set-webhook':
                $this->setWebhook($data);
                break;
            case 'get-qrcode':
                $this->getQrcode($data);
                break;
            case 'check-status':
                $this->checkStatus($data);
                break;
            case 'send-message':
                $this->handleSendMessage($data);
                break;
            case 'trigger-automation':
                $this->triggerAutomation($data);
                break;
            case 'notify-commission':
                $this->notifyCommission($data);
                break;
            case 'notify-commission-paid':
                $this->notifyCommissionPaid($data);
                break;
            default:
                Response::error("Unknown action: {$action}");
        }
    }

    private function createInstance(array $data): void
    {
        $instanceName = $data['instanceName'] ?? '';
        $professionalId = $data['professionalId'] ?? '';

        $res = $this->evolutionRequest('/instance/create', 'POST', [
            'instanceName' => $instanceName,
            'integration' => 'WHATSAPP-BAILEYS',
            'qrcode' => true,
        ]);

        // Save instance
        $stmt = $this->db->prepare('INSERT INTO whatsapp_instances (id, professional_id, instance_name, instance_id, status, qr_code) 
            VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE instance_name = VALUES(instance_name), status = VALUES(status), qr_code = VALUES(qr_code)');
        $stmt->execute([
            Database::uuid(), $professionalId, $instanceName,
            $res['data']['instance']['instanceName'] ?? $instanceName,
            'connecting', $res['data']['qrcode']['base64'] ?? '',
        ]);

        // Auto-configure webhook
        $config = require __DIR__ . '/../config/app.php';
        $webhookUrl = ($config['app_url'] ?? '') . '/api/whatsapp-webhook';
        $this->evolutionRequest("/webhook/set/{$instanceName}", 'POST', [
            'webhook' => [
                'enabled' => true, 'url' => $webhookUrl,
                'webhookByEvents' => false, 'webhookBase64' => false,
                'events' => ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
            ],
        ]);

        Response::success($res['data']);
    }

    private function setWebhook(array $data): void
    {
        $instanceName = $data['instanceName'] ?? '';
        $config = require __DIR__ . '/../config/app.php';
        $webhookUrl = ($config['app_url'] ?? '') . '/api/whatsapp-webhook';

        $res = $this->evolutionRequest("/webhook/set/{$instanceName}", 'POST', [
            'webhook' => [
                'enabled' => true, 'url' => $webhookUrl,
                'webhookByEvents' => false, 'webhookBase64' => false,
                'events' => ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
            ],
        ]);
        Response::success($res['data']);
    }

    private function getQrcode(array $data): void
    {
        $res = $this->evolutionRequest("/instance/connect/{$data['instanceName']}");
        Response::success($res['data']);
    }

    private function checkStatus(array $data): void
    {
        $instanceName = $data['instanceName'] ?? '';
        $res = $this->evolutionRequest("/instance/connectionState/{$instanceName}");

        if (!empty($data['professionalId'])) {
            $status = $res['status'] === 404 ? 'disconnected' : (($res['data']['instance']['state'] ?? '') === 'open' ? 'connected' : 'disconnected');
            $stmt = $this->db->prepare('UPDATE whatsapp_instances SET status = ? WHERE professional_id = ?');
            $stmt->execute([$status, $data['professionalId']]);
        }
        Response::success($res['data']);
    }

    private function handleSendMessage(array $data): void
    {
        $res = $this->sendMessage($data['instanceName'], $data['phone'], $data['message']);
        if ($res['status'] === 404) {
            $stmt = $this->db->prepare("UPDATE whatsapp_instances SET status = 'disconnected' WHERE instance_name = ?");
            $stmt->execute([$data['instanceName']]);
        }
        Response::success($res['data']);
    }

    public function triggerAutomation(array $data): void
    {
        $professionalId = $data['professionalId'] ?? '';
        $bookingId = $data['bookingId'] ?? '';
        $triggerType = $data['triggerType'] ?? '';

        // Get professional
        $stmt = $this->db->prepare('SELECT id, slug, welcome_message, reminder_message, confirmation_message, business_name, name FROM professionals WHERE id = ?');
        $stmt->execute([$professionalId]);
        $prof = $stmt->fetch();
        if (!$prof) { Response::success(['success' => false, 'error' => 'Profissional não encontrado']); return; }

        // Get instance
        $stmt = $this->db->prepare("SELECT instance_name, status FROM whatsapp_instances WHERE professional_id = ? LIMIT 1");
        $stmt->execute([$professionalId]);
        $inst = $stmt->fetch();
        if (!$inst || $inst['status'] !== 'connected') { Response::success(['success' => false, 'error' => 'WhatsApp não conectado']); return; }

        // Get automation
        $stmt = $this->db->prepare('SELECT * FROM whatsapp_automations WHERE professional_id = ? AND automation_type = ? AND is_enabled = 1 LIMIT 1');
        $stmt->execute([$professionalId, $triggerType]);
        $automation = $stmt->fetch();
        if (!$automation) { Response::success(['success' => false, 'error' => 'Automação não ativa']); return; }
...
        $messageTemplate = $automation['custom_message'];

        if ($triggerType === 'booking_created' && $prof['confirmation_message']) {
            $messageTemplate = $prof['confirmation_message'];
            if ($bookingLink) $messageTemplate .= "\n\n📅 Agende novamente: {$bookingLink}";
        } elseif (in_array($triggerType, ['reminder_24h', 'reminder_3h']) && $prof['reminder_message']) {
            $messageTemplate = $prof['reminder_message'];
        } elseif ($triggerType === 'post_service') {
            if ($prof['welcome_message']) $messageTemplate = $prof['welcome_message'];
            if ($bookingLink) $messageTemplate .= "\n\n📅 Agende novamente: {$bookingLink}";
        }

        $finalMessage = self::replaceVars($messageTemplate, $vars);
        $res = $this->sendMessage($inst['instance_name'], $phone, $finalMessage);

        if ($res['status'] === 404 && ($res['provider'] ?? '') === 'evolution') {
            $stmt = $this->db->prepare("UPDATE whatsapp_instances SET status = 'disconnected' WHERE instance_name = ?");
            $stmt->execute([$inst['instance_name']]);
        }

        $provider = $res['provider'] ?? 'evolution';

        // Log with provider tracking
        $stmt = $this->db->prepare('INSERT INTO whatsapp_logs (id, professional_id, automation_id, booking_id, recipient_phone, message_content, status, sent_at, error_message, provider) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([
            Database::uuid(), $professionalId, $automation['id'], $bookingId, $phone, $finalMessage,
            $res['ok'] ? 'sent' : 'failed',
            $res['ok'] ? date('c') : null,
            $res['ok'] ? null : json_encode($res['data']),
            $provider,
        ]);

        Response::success(['success' => $res['ok'], 'data' => $res['data']]);
    }

    private function notifyCommission(array $data): void
    {
        $professionalId = $data['professionalId'];
        $employeeId = $data['employeeId'];

        $stmt = $this->db->prepare('SELECT name, phone FROM salon_employees WHERE id = ?');
        $stmt->execute([$employeeId]);
        $employee = $stmt->fetch();
        if (!$employee || !$employee['phone']) { Response::success(['success' => false, 'error' => 'Funcionário sem telefone']); return; }

        $stmt = $this->db->prepare("SELECT instance_name, status FROM whatsapp_instances WHERE professional_id = ? LIMIT 1");
        $stmt->execute([$professionalId]);
        $inst = $stmt->fetch();
        if (!$inst || $inst['status'] !== 'connected') { Response::success(['success' => false, 'error' => 'WhatsApp não conectado']); return; }

        $msg = "💰 *Nova comissão pendente!*\n\nOlá {$employee['name']}! Você tem uma nova comissão:\n\n💇 Valor do serviço: R$ " . number_format($data['bookingAmount'], 2, '.', '') . "\n📊 Percentual: {$data['percentage']}%\n💵 Sua comissão: *R$ " . number_format($data['commissionAmount'], 2, '.', '') . "*\n\nAguarde o repasse pelo gestor. 😊";

        $res = $this->sendMessage($inst['instance_name'], $employee['phone'], $msg);

        $stmt = $this->db->prepare('INSERT INTO whatsapp_logs (id, professional_id, recipient_phone, message_content, status, sent_at) VALUES (?, ?, ?, ?, ?, ?)');
        $stmt->execute([Database::uuid(), $professionalId, self::normalizePhone($employee['phone']), $msg, $res['ok'] ? 'sent' : 'failed', $res['ok'] ? date('c') : null]);

        Response::success(['success' => $res['ok']]);
    }

    private function notifyCommissionPaid(array $data): void
    {
        $professionalId = $data['professionalId'];
        $employeeIds = $data['employeeIds'] ?? [];
        $totalAmount = $data['totalAmount'] ?? 0;

        $stmt = $this->db->prepare("SELECT instance_name, status FROM whatsapp_instances WHERE professional_id = ? LIMIT 1");
        $stmt->execute([$professionalId]);
        $inst = $stmt->fetch();
        if (!$inst || $inst['status'] !== 'connected') { Response::success(['success' => false, 'error' => 'WhatsApp não conectado']); return; }

        $results = [];
        foreach ($employeeIds as $empId) {
            $stmt = $this->db->prepare('SELECT name, phone FROM salon_employees WHERE id = ?');
            $stmt->execute([$empId]);
            $employee = $stmt->fetch();
            if (!$employee || !$employee['phone']) { $results[] = ['employeeId' => $empId, 'success' => false]; continue; }

            $msg = "✅ *Comissão paga!*\n\nOlá {$employee['name']}! Suas comissões foram pagas.\n\n💵 Valor total: *R$ " . number_format($totalAmount, 2, '.', '') . "*\n\nObrigado pelo excelente trabalho! 🎉";
            $res = $this->sendMessage($inst['instance_name'], $employee['phone'], $msg);
            $results[] = ['employeeId' => $empId, 'success' => $res['ok']];
        }

        Response::success(['success' => true, 'results' => $results]);
    }
}
