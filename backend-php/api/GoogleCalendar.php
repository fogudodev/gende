<?php
/**
 * Google Calendar Integration
 * Replaces: google-calendar-auth, google-calendar-callback, google-calendar-sync
 */

namespace Api;

use Core\Auth;
use Core\Database;
use Core\Response;

class GoogleCalendar
{
    private \PDO $db;
    private string $clientId;
    private string $clientSecret;
    private string $appUrl;

    public function __construct()
    {
        $this->db = Database::getInstance();
        $config = require __DIR__ . '/../config/app.php';
        $this->clientId = $config['google_client_id'] ?? '';
        $this->clientSecret = $config['google_client_secret'] ?? '';
        $this->appUrl = $config['app_url'] ?? '';
    }

    public function handleAuth(array $data): void
    {
        $user = Auth::requireAuth();
        $profId = Auth::getProfessionalId($user['sub']);
        $action = $data['action'] ?? '';

        $redirectUri = $this->appUrl . '/api/google-calendar/callback';

        if ($action === 'get_auth_url') {
            $scopes = urlencode('https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events');
            $authUrl = "https://accounts.google.com/o/oauth2/v2/auth?client_id=" . urlencode($this->clientId) .
                "&redirect_uri=" . urlencode($redirectUri) . "&response_type=code&scope={$scopes}&access_type=offline&prompt=consent&state={$profId}";
            Response::success(['auth_url' => $authUrl]);

        } elseif ($action === 'disconnect') {
            $this->db->prepare('DELETE FROM google_calendar_tokens WHERE professional_id = ?')->execute([$profId]);
            Response::success(['success' => true]);

        } elseif ($action === 'status') {
            $stmt = $this->db->prepare('SELECT sync_enabled, last_synced_at, calendar_id, created_at FROM google_calendar_tokens WHERE professional_id = ?');
            $stmt->execute([$profId]);
            $token = $stmt->fetch();
            Response::success(['connected' => !!$token, ...($token ?: [])]);
        }
    }

    public function handleCallback(): void
    {
        $code = $_GET['code'] ?? '';
        $professionalId = $_GET['state'] ?? '';
        $error = $_GET['error'] ?? '';

        if ($error || !$code || !$professionalId) {
            echo $this->renderHtml('Erro', 'Autorização negada ou parâmetros inválidos.');
            return;
        }

        $redirectUri = $this->appUrl . '/api/google-calendar/callback';

        $ch = curl_init('https://oauth2.googleapis.com/token');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => http_build_query([
                'code' => $code, 'client_id' => $this->clientId,
                'client_secret' => $this->clientSecret,
                'redirect_uri' => $redirectUri, 'grant_type' => 'authorization_code',
            ]),
        ]);
        $tokenData = json_decode(curl_exec($ch), true);
        curl_close($ch);

        if (empty($tokenData['access_token']) || empty($tokenData['refresh_token'])) {
            echo $this->renderHtml('Erro', 'Falha ao obter tokens.');
            return;
        }

        $expiresAt = date('Y-m-d H:i:s', time() + ($tokenData['expires_in'] ?? 3600));
        $stmt = $this->db->prepare('INSERT INTO google_calendar_tokens (id, professional_id, access_token, refresh_token, token_expires_at, calendar_id, sync_enabled) VALUES (?, ?, ?, ?, ?, ?, 1) ON DUPLICATE KEY UPDATE access_token = VALUES(access_token), refresh_token = VALUES(refresh_token), token_expires_at = VALUES(token_expires_at), sync_enabled = 1');
        $stmt->execute([Database::uuid(), $professionalId, $tokenData['access_token'], $tokenData['refresh_token'], $expiresAt, 'primary']);

        echo $this->renderHtml('Sucesso!', 'Google Calendar conectado! Pode fechar esta janela.');
    }

    public function handleSync(array $data): void
    {
        $action = $data['action'] ?? '';
        $profId = $data['professional_id'] ?? '';

        if ($action === 'create_event') {
            $this->createEvent($profId, $data['booking'], $data['booking_id'] ?? '');
        } elseif ($action === 'delete_event') {
            $this->deleteEvent($profId, $data['event_id'] ?? '', $data['booking_id'] ?? '');
        } elseif ($action === 'import_all') {
            $this->importAll();
        }
    }

    private function getValidToken(array $tokenRow): string
    {
        if (strtotime($tokenRow['token_expires_at']) - time() < 300) {
            $ch = curl_init('https://oauth2.googleapis.com/token');
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => http_build_query([
                    'client_id' => $this->clientId, 'client_secret' => $this->clientSecret,
                    'refresh_token' => $tokenRow['refresh_token'], 'grant_type' => 'refresh_token',
                ]),
            ]);
            $data = json_decode(curl_exec($ch), true);
            curl_close($ch);
            if (!empty($data['access_token'])) {
                $this->db->prepare('UPDATE google_calendar_tokens SET access_token = ?, token_expires_at = ? WHERE id = ?')
                    ->execute([$data['access_token'], date('Y-m-d H:i:s', time() + $data['expires_in']), $tokenRow['id']]);
                return $data['access_token'];
            }
        }
        return $tokenRow['access_token'];
    }

    private function createEvent(string $profId, array $booking, string $bookingId): void
    {
        $stmt = $this->db->prepare('SELECT * FROM google_calendar_tokens WHERE professional_id = ? AND sync_enabled = 1');
        $stmt->execute([$profId]);
        $tokenRow = $stmt->fetch();
        if (!$tokenRow) { Response::success(['synced' => false, 'reason' => 'no_token']); return; }

        $accessToken = $this->getValidToken($tokenRow);
        $event = json_encode([
            'summary' => "📅 " . ($booking['service_name'] ?? 'Agendamento') . " - " . ($booking['client_name'] ?? 'Cliente'),
            'start' => ['dateTime' => $booking['start_time'], 'timeZone' => 'America/Sao_Paulo'],
            'end' => ['dateTime' => $booking['end_time'], 'timeZone' => 'America/Sao_Paulo'],
        ]);

        $ch = curl_init("https://www.googleapis.com/calendar/v3/calendars/primary/events");
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => ["Authorization: Bearer {$accessToken}", 'Content-Type: application/json'],
            CURLOPT_POSTFIELDS => $event,
        ]);
        $result = json_decode(curl_exec($ch), true);
        $ok = curl_getinfo($ch, CURLINFO_HTTP_CODE) < 300;
        curl_close($ch);

        if ($ok && $bookingId && !empty($result['id'])) {
            $this->db->prepare('UPDATE bookings SET google_calendar_event_id = ? WHERE id = ?')->execute([$result['id'], $bookingId]);
        }
        Response::success(['synced' => $ok, 'event_id' => $result['id'] ?? null]);
    }

    private function deleteEvent(string $profId, string $eventId, string $bookingId): void
    {
        $stmt = $this->db->prepare('SELECT * FROM google_calendar_tokens WHERE professional_id = ? AND sync_enabled = 1');
        $stmt->execute([$profId]);
        $tokenRow = $stmt->fetch();
        if (!$tokenRow || !$eventId) { Response::success(['synced' => false]); return; }

        $accessToken = $this->getValidToken($tokenRow);
        $ch = curl_init("https://www.googleapis.com/calendar/v3/calendars/primary/events/" . urlencode($eventId));
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true, CURLOPT_CUSTOMREQUEST => 'DELETE',
            CURLOPT_HTTPHEADER => ["Authorization: Bearer {$accessToken}"],
        ]);
        curl_exec($ch);
        curl_close($ch);

        if ($bookingId) {
            $this->db->prepare('UPDATE bookings SET google_calendar_event_id = NULL WHERE id = ?')->execute([$bookingId]);
        }
        Response::success(['synced' => true, 'deleted' => true]);
    }

    private function importAll(): void
    {
        $stmt = $this->db->prepare('SELECT * FROM google_calendar_tokens WHERE sync_enabled = 1');
        $stmt->execute();
        $tokens = $stmt->fetchAll();
        $imported = 0;

        foreach ($tokens as $tokenRow) {
            $accessToken = $this->getValidToken($tokenRow);
            $timeMin = urlencode(date('c'));
            $timeMax = urlencode(date('c', strtotime('+30 days')));

            $ch = curl_init("https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin={$timeMin}&timeMax={$timeMax}&singleEvents=true&maxResults=250");
            curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_HTTPHEADER => ["Authorization: Bearer {$accessToken}"]]);
            $result = json_decode(curl_exec($ch), true);
            curl_close($ch);

            foreach ($result['items'] ?? [] as $event) {
                if (empty($event['start']['dateTime'])) continue;
                if (str_starts_with($event['summary'] ?? '', '📅')) continue;

                $stmt = $this->db->prepare('SELECT id FROM blocked_times WHERE professional_id = ? AND start_time = ? AND end_time = ? LIMIT 1');
                $stmt->execute([$tokenRow['professional_id'], $event['start']['dateTime'], $event['end']['dateTime']]);
                if ($stmt->fetch()) continue;

                $this->db->prepare('INSERT INTO blocked_times (id, professional_id, start_time, end_time, reason) VALUES (?, ?, ?, ?, ?)')->execute([
                    Database::uuid(), $tokenRow['professional_id'], $event['start']['dateTime'], $event['end']['dateTime'],
                    'Google Calendar: ' . ($event['summary'] ?? 'Evento'),
                ]);
                $imported++;
            }
            $this->db->prepare('UPDATE google_calendar_tokens SET last_synced_at = NOW() WHERE id = ?')->execute([$tokenRow['id']]);
        }

        Response::success(['synced' => true, 'imported' => $imported]);
    }

    private function renderHtml(string $title, string $msg): string
    {
        return "<!DOCTYPE html><html><head><meta charset='utf-8'><title>{$title}</title>
<style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#09090B;color:#FAFAFA;}
.card{text-align:center;padding:2rem;border-radius:1rem;background:#1a1a2e;max-width:400px;}h1{font-size:1.5rem;}p{color:#888;}</style></head>
<body><div class='card'><h1>{$title}</h1><p>{$msg}</p></div><script>setTimeout(()=>window.close(),3000)</script></body></html>";
    }
}
