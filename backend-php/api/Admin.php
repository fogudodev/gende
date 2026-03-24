<?php
/**
 * Admin Functions
 * Replaces: admin-create-professional, admin-delete-user, admin-impersonate, create-reception-user, notify-signup
 */

namespace Api;

use Core\Auth;
use Core\Database;
use Core\Response;

class Admin
{
    private \PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    public function createProfessional(array $data): void
    {
        Auth::requireAdmin();
        $name = $data['name'] ?? '';
        $email = $data['email'] ?? '';
        $password = $data['password'] ?? '';
        $phone = $data['phone'] ?? '';
        $accountType = $data['accountType'] ?? 'autonomous';
        $businessName = $data['businessName'] ?? '';
        $role = $data['role'] ?? '';
        $isSupport = $role === 'support';

        if (!$name || !$email || !$password) { Response::error('Campos obrigatórios: name, email, password'); return; }

        // Check if email exists
        $stmt = $this->db->prepare('SELECT id FROM users WHERE email = ?');
        $stmt->execute([$email]);
        if ($stmt->fetch()) { Response::error('Email já cadastrado', 409); return; }

        $userId = Database::uuid();
        $hash = password_hash($password, PASSWORD_BCRYPT);

        $this->db->beginTransaction();
        try {
            $this->db->prepare('INSERT INTO users (id, email, password_hash, raw_user_meta_data) VALUES (?, ?, ?, ?)')->execute([$userId, $email, $hash, json_encode(['name' => $name, 'account_type' => $isSupport ? 'autonomous' : $accountType, 'business_name' => $isSupport ? '' : $businessName, 'is_support' => $isSupport])]);

            if ($isSupport) {
                $this->db->prepare('INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)')->execute([Database::uuid(), $userId, 'support']);
            } else {
                $profId = Database::uuid();
                $this->db->prepare('INSERT INTO professionals (id, user_id, name, email, account_type, business_name, phone) VALUES (?, ?, ?, ?, ?, ?, ?)')->execute([$profId, $userId, $name, $email, $accountType, $businessName, $phone]);
                $this->db->prepare('INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)')->execute([Database::uuid(), $userId, 'professional']);
                $this->db->prepare("INSERT INTO subscriptions (id, professional_id, plan_id, status, current_period_start, current_period_end) VALUES (?, ?, 'enterprise', 'active', NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY))")->execute([Database::uuid(), $profId]);

                // Create default automations (MySQL schema)
                foreach (['booking_created', 'reminder_24h', 'reminder_3h', 'post_service', 'post_sale_review', 'maintenance_reminder', 'reactivation_30d'] as $trigger) {
                    $this->db->prepare("INSERT INTO whatsapp_automations (id, professional_id, automation_type, custom_message, is_enabled) VALUES (?, ?, ?, '', ?) ON DUPLICATE KEY UPDATE automation_type = VALUES(automation_type)")
                        ->execute([Database::uuid(), $profId, $trigger, in_array($trigger, ['booking_created', 'reminder_24h']) ? 1 : 0]);
                }
            }

            $this->db->commit();

            // Send credentials via WhatsApp
            $whatsappSent = false;
            if ($phone) {
                $whatsapp = new WhatsApp();
                $stmt = $this->db->prepare("SELECT instance_name FROM whatsapp_instances WHERE status = 'connected' LIMIT 1");
                $stmt->execute();
                $inst = $stmt->fetch();
                if ($inst) {
                    $msg = "🎉 *Bem-vindo(a) ao Gende!*\n\nOlá {$name}!\n\n📧 *Email:* {$email}\n🔑 *Senha:* {$password}\n\n🔗 Acesse: https://app.gende.io/login\n\nAltere sua senha após o primeiro acesso. 😊";
                    $res = $whatsapp->sendMessage($inst['instance_name'], $phone, $msg);
                    $whatsappSent = $res['ok'];
                }
            }

            Response::success(['success' => true, 'userId' => $userId, 'whatsappSent' => $whatsappSent], 201);
        } catch (\Exception $e) {
            $this->db->rollBack();
            Response::error('Erro ao criar: ' . $e->getMessage(), 500);
        }
    }

    public function deleteUser(array $data): void
    {
        Auth::requireAdmin();
        $profId = $data['professionalId'] ?? '';
        if (!$profId) { Response::error('professionalId é obrigatório'); return; }

        $stmt = $this->db->prepare('SELECT user_id, is_blocked, name FROM professionals WHERE id = ?');
        $stmt->execute([$profId]);
        $prof = $stmt->fetch();
        if (!$prof) { Response::error('Professional not found'); return; }
        if (!$prof['is_blocked']) { Response::error('Only blocked users can be deleted'); return; }

        $userId = $prof['user_id'];
        $tables = ['whatsapp_logs', 'whatsapp_automations', 'whatsapp_instances', 'campaign_contacts', 'campaigns', 'commissions', 'bookings', 'blocked_times', 'working_hours', 'reviews', 'expenses', 'products', 'coupons', 'clients', 'services', 'payments', 'payment_config', 'daily_message_usage', 'google_calendar_tokens', 'chat_messages', 'professional_limits', 'salon_employees', 'subscriptions'];

        foreach ($tables as $table) {
            $this->db->prepare("DELETE FROM {$table} WHERE professional_id = ?")->execute([$profId]);
        }
        $this->db->prepare('DELETE FROM user_roles WHERE user_id = ?')->execute([$userId]);
        $this->db->prepare('DELETE FROM professionals WHERE id = ?')->execute([$profId]);
        $this->db->prepare('DELETE FROM users WHERE id = ?')->execute([$userId]);

        Response::success(['success' => true, 'deletedUser' => $prof['name']]);
    }

    public function impersonate(array $data): void
    {
        Auth::requireAdmin();
        $userId = $data['userId'] ?? '';
        if (!$userId) { Response::error('userId é obrigatório', 400); return; }

        $stmt = $this->db->prepare('SELECT * FROM users WHERE id = ?');
        $stmt->execute([$userId]);
        $targetUser = $stmt->fetch();
        if (!$targetUser) { Response::error('Usuário não encontrado', 404); return; }

        // Generate token for the target user
        $stmtR = $this->db->prepare('SELECT role FROM user_roles WHERE user_id = ?');
        $stmtR->execute([$userId]);
        $roles = array_column($stmtR->fetchAll(), 'role');

        $token = Auth::generateToken($userId, $targetUser['email'], $roles);
        $refreshToken = Auth::generateRefreshToken($userId);

        Response::success(['success' => true, 'access_token' => $token, 'refresh_token' => $refreshToken]);
    }

    public function createReceptionUser(array $data): void
    {
        $user = Auth::requireAuth();
        $name = $data['name'] ?? '';
        $email = $data['email'] ?? '';
        $password = $data['password'] ?? '';
        $employeeId = $data['employeeId'] ?? '';
        $salonId = $data['salonId'] ?? '';

        if (!$name || !$email || !$password || !$employeeId || !$salonId) { Response::error('Missing required fields', 400); return; }

        // Verify ownership
        $stmt = $this->db->prepare('SELECT id FROM professionals WHERE id = ? AND user_id = ?');
        $stmt->execute([$salonId, $user['sub']]);
        $isOwner = (bool)$stmt->fetch();
        $isAdmin = Auth::hasRole($user['sub'], 'admin');
        if (!$isOwner && !$isAdmin) { Response::error('Not authorized', 403); return; }

        $userId = Database::uuid();
        $hash = password_hash($password, PASSWORD_BCRYPT);

        $this->db->prepare('INSERT INTO users (id, email, password_hash, raw_user_meta_data) VALUES (?, ?, ?, ?)')->execute([$userId, $email, $hash, json_encode(['name' => $name, 'is_reception' => true])]);
        $this->db->prepare('INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)')->execute([Database::uuid(), $userId, 'user']);
        $this->db->prepare("UPDATE salon_employees SET user_id = ?, has_login = 1, role = 'reception' WHERE id = ?")->execute([$userId, $employeeId]);

        Response::success(['success' => true, 'userId' => $userId]);
    }

    public function notifySignup(array $data): void
    {
        $whatsapp = new WhatsApp();
        $adminPhone = '5521979267979';
        $message = "🆕 *Novo cadastro no Gende!*\n\n👤 *Nome:* " . ($data['name'] ?? 'N/A') . "\n🏪 *Studio:* " . ($data['businessName'] ?? 'N/A') . "\n📧 *Email:* " . ($data['email'] ?? 'N/A') . "\n📱 *WhatsApp:* " . ($data['phone'] ?? 'N/A') . "\n\n📅 *Data:* " . date('d/m/Y H:i');

        $stmt = $this->db->prepare("SELECT instance_name FROM whatsapp_instances WHERE status = 'connected' LIMIT 1");
        $stmt->execute();
        $inst = $stmt->fetch();
        $success = false;
        if ($inst) {
            $res = $whatsapp->sendMessage($inst['instance_name'], $adminPhone, $message);
            $success = $res['ok'];
        }
        Response::success(['success' => $success]);
    }
}
