<?php

namespace WebSocket;

use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

/**
 * Gende Realtime WebSocket Server
 * 
 * Supports channels similar to Supabase Realtime:
 * - Subscribe to table changes (bookings, chat_messages, etc.)
 * - Scoped by professional_id (multi-tenant)
 * - JWT authentication
 */
class RealtimeServer implements MessageComponentInterface
{
    /** @var \SplObjectStorage<ConnectionInterface, ClientInfo> */
    protected \SplObjectStorage $clients;

    /** @var array<string, ConnectionInterface[]> Channel subscriptions */
    protected array $channels = [];

    /** @var string JWT secret */
    protected string $jwtSecret;

    public function __construct()
    {
        $this->clients = new \SplObjectStorage();

        // Load JWT secret from env or config
        $envFile = __DIR__ . '/../config/.env';
        if (file_exists($envFile)) {
            foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
                if (str_starts_with(trim($line), '#')) continue;
                if (str_contains($line, '=')) {
                    [$key, $value] = explode('=', $line, 2);
                    putenv(trim($key) . '=' . trim($value));
                }
            }
        }

        $this->jwtSecret = getenv('JWT_SECRET') ?: 'CHANGE_ME';
        echo "📡 RealtimeServer initialized\n";
    }

    public function onOpen(ConnectionInterface $conn): void
    {
        $this->clients->attach($conn, new ClientInfo());
        echo "🔌 New connection: {$conn->resourceId}\n";
    }

    public function onMessage(ConnectionInterface $from, $msg): void
    {
        $data = json_decode($msg, true);
        if (!$data || !isset($data['type'])) {
            $this->send($from, ['type' => 'error', 'message' => 'Invalid message format']);
            return;
        }

        match ($data['type']) {
            'auth'        => $this->handleAuth($from, $data),
            'subscribe'   => $this->handleSubscribe($from, $data),
            'unsubscribe' => $this->handleUnsubscribe($from, $data),
            'broadcast'   => $this->handleBroadcast($from, $data),
            'ping'        => $this->send($from, ['type' => 'pong']),
            default       => $this->send($from, ['type' => 'error', 'message' => 'Unknown message type']),
        };
    }

    public function onClose(ConnectionInterface $conn): void
    {
        // Remove from all channels
        foreach ($this->channels as $channel => &$subscribers) {
            $subscribers = array_filter($subscribers, fn($c) => $c !== $conn);
            if (empty($subscribers)) {
                unset($this->channels[$channel]);
            }
        }

        $info = $this->clients[$conn] ?? null;
        $this->clients->detach($conn);
        echo "🔌 Disconnected: {$conn->resourceId}" . ($info?->userId ? " (user: {$info->userId})" : "") . "\n";
    }

    public function onError(ConnectionInterface $conn, \Exception $e): void
    {
        echo "❌ Error on {$conn->resourceId}: {$e->getMessage()}\n";
        $conn->close();
    }

    // ============================================
    // Auth
    // ============================================
    protected function handleAuth(ConnectionInterface $conn, array $data): void
    {
        $token = $data['token'] ?? '';
        if (!$token) {
            $this->send($conn, ['type' => 'auth_error', 'message' => 'Token required']);
            return;
        }

        try {
            $payload = JWT::decode($token, new Key($this->jwtSecret, 'HS256'));
            $info = $this->clients[$conn];
            $info->userId = $payload->sub;
            $info->email = $payload->email ?? '';
            $info->roles = (array) ($payload->roles ?? []);
            $info->authenticated = true;

            // Resolve professional_id
            $info->professionalId = $this->resolveProfessionalId($info->userId);

            $this->send($conn, [
                'type' => 'auth_success',
                'user_id' => $info->userId,
                'professional_id' => $info->professionalId,
            ]);

            echo "🔐 Authenticated: {$conn->resourceId} → user:{$info->userId}, prof:{$info->professionalId}\n";
        } catch (\Exception $e) {
            $this->send($conn, ['type' => 'auth_error', 'message' => 'Invalid token: ' . $e->getMessage()]);
        }
    }

    // ============================================
    // Subscribe to channels
    // ============================================
    protected function handleSubscribe(ConnectionInterface $conn, array $data): void
    {
        $info = $this->clients[$conn];
        if (!$info->authenticated) {
            $this->send($conn, ['type' => 'error', 'message' => 'Not authenticated']);
            return;
        }

        $channel = $data['channel'] ?? '';
        if (!$channel) {
            $this->send($conn, ['type' => 'error', 'message' => 'Channel required']);
            return;
        }

        // Scope channel to professional_id for multi-tenancy
        $scopedChannel = "{$channel}:{$info->professionalId}";

        if (!isset($this->channels[$scopedChannel])) {
            $this->channels[$scopedChannel] = [];
        }

        // Avoid duplicates
        foreach ($this->channels[$scopedChannel] as $sub) {
            if ($sub === $conn) {
                $this->send($conn, ['type' => 'subscribed', 'channel' => $channel]);
                return;
            }
        }

        $this->channels[$scopedChannel][] = $conn;
        $this->send($conn, ['type' => 'subscribed', 'channel' => $channel]);

        echo "📺 {$conn->resourceId} subscribed to {$scopedChannel}\n";
    }

    // ============================================
    // Unsubscribe
    // ============================================
    protected function handleUnsubscribe(ConnectionInterface $conn, array $data): void
    {
        $info = $this->clients[$conn];
        $channel = $data['channel'] ?? '';
        $scopedChannel = "{$channel}:{$info->professionalId}";

        if (isset($this->channels[$scopedChannel])) {
            $this->channels[$scopedChannel] = array_filter(
                $this->channels[$scopedChannel],
                fn($c) => $c !== $conn
            );
        }

        $this->send($conn, ['type' => 'unsubscribed', 'channel' => $channel]);
    }

    // ============================================
    // Broadcast to channel
    // ============================================
    protected function handleBroadcast(ConnectionInterface $from, array $data): void
    {
        $info = $this->clients[$from];
        if (!$info->authenticated) return;

        $channel = $data['channel'] ?? '';
        $payload = $data['payload'] ?? [];
        $scopedChannel = "{$channel}:{$info->professionalId}";

        if (!isset($this->channels[$scopedChannel])) return;

        $message = json_encode([
            'type'    => 'broadcast',
            'channel' => $channel,
            'event'   => $data['event'] ?? 'message',
            'payload' => $payload,
        ]);

        foreach ($this->channels[$scopedChannel] as $subscriber) {
            if ($subscriber !== $from) {
                $subscriber->send($message);
            }
        }
    }

    /**
     * Notify a specific channel about a database change.
     * Called from the PHP API when data is modified.
     */
    public function notifyChange(string $table, string $professionalId, string $event, array $record): void
    {
        $scopedChannel = "{$table}:{$professionalId}";

        if (!isset($this->channels[$scopedChannel])) return;

        $message = json_encode([
            'type'    => 'postgres_changes',
            'channel' => $table,
            'event'   => $event, // INSERT, UPDATE, DELETE
            'payload' => [
                'table'  => $table,
                'type'   => $event,
                'record' => $record,
            ],
        ]);

        foreach ($this->channels[$scopedChannel] as $subscriber) {
            $subscriber->send($message);
        }
    }

    // ============================================
    // Helpers
    // ============================================
    protected function send(ConnectionInterface $conn, array $data): void
    {
        $conn->send(json_encode($data));
    }

    protected function resolveProfessionalId(string $userId): ?string
    {
        // Connect to MySQL to resolve
        try {
            $dbConfig = require __DIR__ . '/../config/database.php';
            $dsn = "mysql:host={$dbConfig['host']};port={$dbConfig['port']};dbname={$dbConfig['database']};charset={$dbConfig['charset']}";
            $pdo = new \PDO($dsn, $dbConfig['username'], $dbConfig['password']);
            $stmt = $pdo->prepare('SELECT id FROM professionals WHERE user_id = ? LIMIT 1');
            $stmt->execute([$userId]);
            $row = $stmt->fetch(\PDO::FETCH_ASSOC);
            return $row['id'] ?? null;
        } catch (\Exception $e) {
            echo "⚠️ Could not resolve professional_id: {$e->getMessage()}\n";
            return null;
        }
    }
}

// ============================================
// Client metadata
// ============================================
class ClientInfo
{
    public bool $authenticated = false;
    public ?string $userId = null;
    public ?string $email = null;
    public ?string $professionalId = null;
    public array $roles = [];
}
