<?php
/**
 * Instagram DM Automation
 * Replaces: instagram-oauth, instagram-webhook
 */

namespace Api;

use Core\Auth;
use Core\Database;
use Core\Response;

class Instagram
{
    private \PDO $db;
    private string $metaAppId;
    private string $metaAppSecret;

    public function __construct()
    {
        $this->db = Database::getInstance();
        $config = require __DIR__ . '/../config/app.php';
        $this->metaAppId = $config['meta_app_id'] ?? '';
        $this->metaAppSecret = $config['meta_app_secret'] ?? '';
    }

    public function handleOAuth(array $data): void
    {
        $user = Auth::requireAuth();
        $action = $data['action'] ?? '';

        if ($action === 'get_auth_url') {
            $redirectUri = urlencode($data['redirect_uri'] ?? '');
            $scopes = 'instagram_basic,instagram_manage_messages,pages_show_list,pages_read_engagement';
            $authUrl = "https://www.facebook.com/v21.0/dialog/oauth?client_id={$this->metaAppId}&redirect_uri={$redirectUri}&scope={$scopes}&state={$user['sub']}&response_type=code";
            Response::success(['auth_url' => $authUrl]);

        } elseif ($action === 'exchange_code') {
            $code = $data['code'] ?? '';
            $redirectUri = $data['redirect_uri'] ?? '';
            if (!$code || !$redirectUri) { Response::error('Código ou redirect_uri inválido', 400); return; }

            // Exchange code for token
            $tokenData = $this->metaRequest("https://graph.facebook.com/v21.0/oauth/access_token?client_id={$this->metaAppId}&client_secret={$this->metaAppSecret}&redirect_uri=" . urlencode($redirectUri) . "&code={$code}");
            if (empty($tokenData['access_token'])) { Response::error($tokenData['error']['message'] ?? 'Erro ao trocar código', 400); return; }

            // Long-lived token
            $longData = $this->metaRequest("https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id={$this->metaAppId}&client_secret={$this->metaAppSecret}&fb_exchange_token={$tokenData['access_token']}");
            $token = $longData['access_token'] ?? $tokenData['access_token'];
            $expiresIn = $longData['expires_in'] ?? 5184000;

            // Get pages with Instagram
            $pages = $this->metaRequest("https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token={$token}");
            $igAccountId = null; $pageToken = null;
            foreach ($pages['data'] ?? [] as $page) {
                if (!empty($page['instagram_business_account']['id'])) {
                    $igAccountId = $page['instagram_business_account']['id'];
                    $pageToken = $page['access_token'];
                    break;
                }
            }
            if (!$igAccountId) { Response::error('Nenhuma conta Instagram Business encontrada', 400); return; }

            $igInfo = $this->metaRequest("https://graph.facebook.com/v21.0/{$igAccountId}?fields=username,name&access_token={$pageToken}");
            $profId = Auth::getProfessionalId($user['sub']);

            $stmt = $this->db->prepare('INSERT INTO instagram_accounts (id, professional_id, instagram_user_id, username, account_name, page_id, access_token, token_expiration, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1) ON DUPLICATE KEY UPDATE instagram_user_id = VALUES(instagram_user_id), username = VALUES(username), access_token = VALUES(access_token), token_expiration = VALUES(token_expiration), is_active = 1');
            $stmt->execute([Database::uuid(), $profId, $igAccountId, $igInfo['username'] ?? '', $igInfo['name'] ?? '', $pages['data'][0]['id'] ?? '', $pageToken, date('Y-m-d H:i:s', time() + $expiresIn)]);

            Response::success(['success' => true, 'username' => $igInfo['username'] ?? '']);

        } elseif ($action === 'disconnect') {
            $profId = Auth::getProfessionalId($user['sub']);
            $this->db->prepare('UPDATE instagram_accounts SET is_active = 0 WHERE professional_id = ?')->execute([$profId]);
            Response::success(['success' => true]);
        }
    }

    public function handleWebhook(): void
    {
        // GET = verification
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            $config = require __DIR__ . '/../config/app.php';
            $verifyToken = $config['meta_webhook_verify_token'] ?? '';
            if (($_GET['hub_mode'] ?? '') === 'subscribe' && ($_GET['hub_verify_token'] ?? '') === $verifyToken) {
                echo $_GET['hub_challenge'] ?? '';
                exit;
            }
            http_response_code(403);
            exit;
        }

        $body = json_decode(file_get_contents('php://input'), true);
        if (($body['object'] ?? '') !== 'instagram') { Response::success(['ok' => true]); return; }

        foreach ($body['entry'] ?? [] as $entry) {
            $igUserId = $entry['id'] ?? '';
            $stmt = $this->db->prepare('SELECT * FROM instagram_accounts WHERE instagram_user_id = ? AND is_active = 1 LIMIT 1');
            $stmt->execute([$igUserId]);
            $account = $stmt->fetch();
            if (!$account) continue;

            foreach ($entry['messaging'] ?? [] as $event) {
                $senderId = $event['sender']['id'] ?? '';
                $messageText = $event['message']['text'] ?? '';
                if (!$messageText || $senderId === $igUserId) continue;

                $this->db->prepare('INSERT INTO instagram_messages (id, professional_id, instagram_user_id, sender_id, message_text, message_type, direction) VALUES (?, ?, ?, ?, ?, ?, ?)')->execute([
                    Database::uuid(), $account['professional_id'], $igUserId, $senderId, $messageText, 'dm', 'incoming',
                ]);

                if ($account['auto_reply_enabled']) {
                    $this->handleAutoReply($account, $senderId, $messageText);
                }
            }

            foreach ($entry['changes'] ?? [] as $change) {
                if ($change['field'] !== 'comments') continue;
                $commentText = $change['value']['text'] ?? '';
                $commenterId = $change['value']['from']['id'] ?? '';
                if (!$commenterId || $commenterId === $igUserId) continue;

                $this->db->prepare('INSERT INTO instagram_messages (id, professional_id, instagram_user_id, sender_id, sender_username, message_text, message_type, direction) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')->execute([
                    Database::uuid(), $account['professional_id'], $igUserId, $commenterId, $change['value']['from']['username'] ?? '', $commentText, 'comment', 'incoming',
                ]);

                if ($account['auto_comment_reply_enabled']) {
                    $this->handleCommentKeyword($account, $commenterId, $commentText);
                }
            }
        }

        Response::success(['success' => true]);
    }

    private function handleAutoReply(array $account, string $senderId, string $messageText): void
    {
        $config = require __DIR__ . '/../config/app.php';
        $apiKey = $config['gemini_api_key'] ?? '';
        if (!$apiKey) return;

        $stmt = $this->db->prepare('SELECT name, price, duration_minutes FROM services WHERE professional_id = ? AND active = 1 LIMIT 10');
        $stmt->execute([$account['professional_id']]);
        $services = $stmt->fetchAll();

        $stmt = $this->db->prepare('SELECT name, business_name, slug FROM professionals WHERE id = ?');
        $stmt->execute([$account['professional_id']]);
        $prof = $stmt->fetch();
        $salonName = $prof['business_name'] ?: ($prof['name'] ?? '');

        $serviceList = implode("\n", array_map(fn($s, $i) => ($i + 1) . ". {$s['name']} - R\${$s['price']} ({$s['duration_minutes']}min)", $services, array_keys($services)));

        $systemPrompt = "Você é a assistente virtual do {$salonName} no Instagram. Responda de forma simpática e breve (máx 200 palavras).\n\nServiços:\n{$serviceList}";

        $ch = curl_init('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json', "Authorization: Bearer {$apiKey}"],
            CURLOPT_POSTFIELDS => json_encode([
                'model' => 'gemini-2.5-flash',
                'messages' => [['role' => 'system', 'content' => $systemPrompt], ['role' => 'user', 'content' => $messageText]],
            ]),
        ]);
        $data = json_decode(curl_exec($ch), true);
        curl_close($ch);

        $replyText = $data['choices'][0]['message']['content'] ?? '';
        if (!$replyText) return;

        $this->sendInstagramDM($account, $senderId, $replyText);
    }

    private function handleCommentKeyword(array $account, string $commenterId, string $commentText): void
    {
        $stmt = $this->db->prepare('SELECT * FROM instagram_keywords WHERE professional_id = ? AND is_active = 1');
        $stmt->execute([$account['professional_id']]);
        $keywords = $stmt->fetchAll();
        $lower = mb_strtolower($commentText);

        $matched = null;
        foreach ($keywords as $kw) {
            if (str_contains($lower, mb_strtolower($kw['keyword']))) { $matched = $kw; break; }
        }
        if (!$matched) return;

        $this->db->prepare('UPDATE instagram_keywords SET trigger_count = trigger_count + 1 WHERE id = ?')->execute([$matched['id']]);

        $stmt = $this->db->prepare('SELECT name, business_name, slug FROM professionals WHERE id = ?');
        $stmt->execute([$account['professional_id']]);
        $prof = $stmt->fetch();
        $bookingLink = $prof['slug'] ? "https://gende.io/{$prof['slug']}" : '';

        $replyText = $matched['custom_response'] ?: "Oi! 👋 Vi que você comentou no nosso post.\n\nQue bom que se interessou! ✨\n\n" . ($bookingLink ? "Agende seu horário: {$bookingLink}\n\n" : '') . "Estamos te esperando! 💇‍♀️";

        $this->sendInstagramDM($account, $commenterId, $replyText);
    }

    private function sendInstagramDM(array $account, string $recipientId, string $text): void
    {
        $ch = curl_init("https://graph.instagram.com/v21.0/{$account['instagram_user_id']}/messages");
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => ["Authorization: Bearer {$account['access_token']}", 'Content-Type: application/json'],
            CURLOPT_POSTFIELDS => json_encode(['recipient' => ['id' => $recipientId], 'message' => ['text' => $text]]),
        ]);
        $ok = curl_getinfo($ch, CURLINFO_HTTP_CODE) < 300;
        curl_close($ch);

        if ($ok) {
            $this->db->prepare('INSERT INTO instagram_messages (id, professional_id, instagram_user_id, sender_id, message_text, message_type, direction) VALUES (?, ?, ?, ?, ?, ?, ?)')->execute([
                Database::uuid(), $account['professional_id'], $account['instagram_user_id'], $account['instagram_user_id'], $text, 'dm', 'outgoing',
            ]);
        }
    }

    private function metaRequest(string $url): array
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 15]);
        $data = json_decode(curl_exec($ch), true);
        curl_close($ch);
        return $data ?? [];
    }
}
