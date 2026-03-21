<?php

namespace Core;

class Auth
{
    private static array $config = [];

    private static function getConfig(): array
    {
        if (empty(self::$config)) {
            self::$config = require __DIR__ . '/../config/app.php';
        }
        return self::$config;
    }

    /**
     * Generate a JWT token
     */
    public static function generateToken(string $userId, string $email, array $roles = []): string
    {
        $config = self::getConfig();
        $header = self::base64url(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
        $payload = self::base64url(json_encode([
            'sub'   => $userId,
            'email' => $email,
            'roles' => $roles,
            'iat'   => time(),
            'exp'   => time() + $config['jwt_expiry'],
        ]));
        $signature = self::base64url(hash_hmac('sha256', "$header.$payload", $config['jwt_secret'], true));
        return "$header.$payload.$signature";
    }

    /**
     * Generate a refresh token
     */
    public static function generateRefreshToken(string $userId): string
    {
        $config = self::getConfig();
        $db = Database::getInstance();
        $token = bin2hex(random_bytes(64));
        $expiresAt = date('Y-m-d H:i:s', time() + $config['refresh_expiry']);

        $stmt = $db->prepare('INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)');
        $stmt->execute([Database::uuid(), $userId, $token, $expiresAt]);

        return $token;
    }

    /**
     * Validate JWT and return payload
     */
    public static function validateToken(string $token): ?array
    {
        $config = self::getConfig();
        $parts = explode('.', $token);
        if (count($parts) !== 3) return null;

        [$header, $payload, $signature] = $parts;
        $expectedSig = self::base64url(hash_hmac('sha256', "$header.$payload", $config['jwt_secret'], true));

        if (!hash_equals($expectedSig, $signature)) return null;

        $data = json_decode(self::base64urlDecode($payload), true);
        if (!$data || ($data['exp'] ?? 0) < time()) return null;

        return $data;
    }

    /**
     * Extract user from Authorization header
     */
    public static function getUserFromRequest(): ?array
    {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (!str_starts_with($header, 'Bearer ')) return null;
        $token = substr($header, 7);
        return self::validateToken($token);
    }

    /**
     * Require authenticated user or die with 401
     */
    public static function requireAuth(): array
    {
        $user = self::getUserFromRequest();
        if (!$user) {
            http_response_code(401);
            die(json_encode(['error' => 'Unauthorized']));
        }
        return $user;
    }

    /**
     * Require admin role
     */
    public static function requireAdmin(): array
    {
        $user = self::requireAuth();
        if (!in_array('admin', $user['roles'] ?? [])) {
            http_response_code(403);
            die(json_encode(['error' => 'Forbidden: admin only']));
        }
        return $user;
    }

    /**
     * Get the professional_id for the current user
     */
    public static function getProfessionalId(string $userId): ?string
    {
        $db = Database::getInstance();
        $stmt = $db->prepare('SELECT id FROM professionals WHERE user_id = ? LIMIT 1');
        $stmt->execute([$userId]);
        $row = $stmt->fetch();
        return $row['id'] ?? null;
    }

    /**
     * Check if user has a specific role
     */
    public static function hasRole(string $userId, string $role): bool
    {
        $db = Database::getInstance();
        $stmt = $db->prepare('SELECT 1 FROM user_roles WHERE user_id = ? AND role = ?');
        $stmt->execute([$userId, $role]);
        return (bool) $stmt->fetch();
    }

    private static function base64url(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64urlDecode(string $data): string
    {
        return base64_decode(strtr($data, '-_', '+/'));
    }
}
