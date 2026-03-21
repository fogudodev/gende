<?php

/**
 * GENDE Backend API - PHP/MySQL
 * Main entry point
 */

// Load .env if exists
$envFile = __DIR__ . '/config/.env';
if (file_exists($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        if (str_starts_with(trim($line), '#')) continue;
        if (str_contains($line, '=')) {
            [$key, $value] = explode('=', $line, 2);
            putenv(trim($key) . '=' . trim($value));
        }
    }
}

// Autoloader
spl_autoload_register(function (string $class) {
    $map = [
        'Core\\' => __DIR__ . '/core/',
        'Api\\'  => __DIR__ . '/api/',
    ];
    foreach ($map as $prefix => $dir) {
        if (str_starts_with($class, $prefix)) {
            $file = $dir . str_replace('\\', '/', substr($class, strlen($prefix))) . '.php';
            if (file_exists($file)) require $file;
        }
    }
});

// Set timezone
date_default_timezone_set('America/Sao_Paulo');

// Headers
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Initialize Router
$router = new Core\Router();

// ============================================
// AUTH ROUTES
// ============================================
$router->post('/auth/signup', function () {
    $data = Core\Request::json();
    $email = $data['email'] ?? '';
    $password = $data['password'] ?? '';
    $name = $data['name'] ?? '';
    $accountType = $data['account_type'] ?? 'autonomous';
    $businessName = $data['business_name'] ?? '';
    $phone = $data['phone'] ?? '';

    if (!$email || !$password) {
        Core\Response::error('Email and password required');
        return;
    }

    $db = Core\Database::getInstance();

    // Check if email exists
    $stmt = $db->prepare('SELECT id FROM users WHERE email = ?');
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        Core\Response::error('Email already registered', 409);
        return;
    }

    $userId = Core\Database::uuid();
    $hash = password_hash($password, PASSWORD_BCRYPT);

    $db->beginTransaction();
    try {
        // Create user
        $stmt = $db->prepare('INSERT INTO users (id, email, password_hash, raw_user_meta_data) VALUES (?, ?, ?, ?)');
        $stmt->execute([$userId, $email, $hash, json_encode([
            'name' => $name, 'account_type' => $accountType,
            'business_name' => $businessName, 'phone' => $phone
        ])]);

        // Create professional
        $profId = Core\Database::uuid();
        $stmt = $db->prepare('INSERT INTO professionals (id, user_id, name, email, account_type, business_name, phone) VALUES (?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([$profId, $userId, $name, $email, $accountType, $businessName, $phone]);

        // Assign role
        $stmt = $db->prepare('INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)');
        $stmt->execute([Core\Database::uuid(), $userId, 'professional']);

        // Admin auto-assign
        if ($email === 'admin@gende.io') {
            $stmt = $db->prepare('INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role=role');
            $stmt->execute([Core\Database::uuid(), $userId, 'admin']);
        }

        // Enterprise trial (30 days)
        $stmt = $db->prepare('INSERT INTO subscriptions (id, professional_id, plan_id, status, current_period_start, current_period_end) VALUES (?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY))');
        $stmt->execute([Core\Database::uuid(), $profId, 'enterprise', 'active']);

        $db->commit();

        // Get roles
        $stmtR = $db->prepare('SELECT role FROM user_roles WHERE user_id = ?');
        $stmtR->execute([$userId]);
        $roles = array_column($stmtR->fetchAll(), 'role');

        $token = Core\Auth::generateToken($userId, $email, $roles);
        $refresh = Core\Auth::generateRefreshToken($userId);

        Core\Response::success([
            'access_token'  => $token,
            'refresh_token' => $refresh,
            'user' => ['id' => $userId, 'email' => $email, 'name' => $name],
        ], 201);
    } catch (\Exception $e) {
        $db->rollBack();
        Core\Response::error('Registration failed: ' . $e->getMessage(), 500);
    }
});

$router->post('/auth/login', function () {
    $data = Core\Request::json();
    $email = $data['email'] ?? '';
    $password = $data['password'] ?? '';

    $db = Core\Database::getInstance();
    $stmt = $db->prepare('SELECT * FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        Core\Response::error('Invalid credentials', 401);
        return;
    }

    $stmtR = $db->prepare('SELECT role FROM user_roles WHERE user_id = ?');
    $stmtR->execute([$user['id']]);
    $roles = array_column($stmtR->fetchAll(), 'role');

    $token = Core\Auth::generateToken($user['id'], $user['email'], $roles);
    $refresh = Core\Auth::generateRefreshToken($user['id']);

    $meta = json_decode($user['raw_user_meta_data'] ?? '{}', true);

    Core\Response::success([
        'access_token'  => $token,
        'refresh_token' => $refresh,
        'user' => [
            'id'    => $user['id'],
            'email' => $user['email'],
            'name'  => $meta['name'] ?? '',
        ],
    ]);
});

$router->post('/auth/refresh', function () {
    $data = Core\Request::json();
    $refreshToken = $data['refresh_token'] ?? '';

    $db = Core\Database::getInstance();
    $stmt = $db->prepare('SELECT * FROM refresh_tokens WHERE token = ? AND expires_at > NOW()');
    $stmt->execute([$refreshToken]);
    $rt = $stmt->fetch();

    if (!$rt) {
        Core\Response::error('Invalid or expired refresh token', 401);
        return;
    }

    // Get user
    $stmt = $db->prepare('SELECT * FROM users WHERE id = ?');
    $stmt->execute([$rt['user_id']]);
    $user = $stmt->fetch();

    // Get roles
    $stmtR = $db->prepare('SELECT role FROM user_roles WHERE user_id = ?');
    $stmtR->execute([$user['id']]);
    $roles = array_column($stmtR->fetchAll(), 'role');

    // Delete old refresh token
    $db->prepare('DELETE FROM refresh_tokens WHERE id = ?')->execute([$rt['id']]);

    $token = Core\Auth::generateToken($user['id'], $user['email'], $roles);
    $newRefresh = Core\Auth::generateRefreshToken($user['id']);

    Core\Response::success([
        'access_token'  => $token,
        'refresh_token' => $newRefresh,
    ]);
});

$router->post('/auth/logout', function () {
    $user = Core\Auth::getUserFromRequest();
    if ($user) {
        $db = Core\Database::getInstance();
        $db->prepare('DELETE FROM refresh_tokens WHERE user_id = ?')->execute([$user['sub']]);
    }
    Core\Response::success();
});

// ============================================
// PROFILE ROUTES
// ============================================
$router->get('/profile', function () {
    $user = Core\Auth::requireAuth();
    $db = Core\Database::getInstance();
    $stmt = $db->prepare('SELECT * FROM professionals WHERE user_id = ?');
    $stmt->execute([$user['sub']]);
    $prof = $stmt->fetch();
    if (!$prof) {
        Core\Response::error('Professional not found', 404);
        return;
    }
    Core\Response::success($prof);
});

$router->put('/profile', function () {
    $user = Core\Auth::requireAuth();
    $data = Core\Request::json();
    unset($data['id'], $data['user_id'], $data['created_at']);

    if (empty($data)) {
        Core\Response::error('No data');
        return;
    }

    $db = Core\Database::getInstance();
    $sets = implode(', ', array_map(fn($k) => "`$k` = ?", array_keys($data)));
    $values = array_values($data);
    $values[] = $user['sub'];

    $stmt = $db->prepare("UPDATE professionals SET $sets WHERE user_id = ?");
    $stmt->execute($values);
    Core\Response::success();
});

// ============================================
// GENERIC CRUD ROUTES FACTORY
// ============================================
$crudRoutes = [
    'services'            => 'services',
    'clients'             => 'clients',
    'bookings'            => 'bookings',
    'working-hours'       => 'working_hours',
    'blocked-times'       => 'blocked_times',
    'products'            => 'products',
    'coupons'             => 'coupons',
    'payments'            => 'payments',
    'reviews'             => 'reviews',
    'expenses'            => 'expenses',
    'commissions'         => 'commissions',
    'campaigns'           => 'campaigns',
    'cash-registers'      => 'cash_registers',
    'cash-transactions'   => 'cash_transactions',
    'whatsapp-instances'  => 'whatsapp_instances',
    'whatsapp-automations'=> 'whatsapp_automations',
    'whatsapp-logs'       => 'whatsapp_logs',
    'conversations'       => 'whatsapp_conversations',
    'message-usage'       => 'daily_message_usage',
    'salon-employees'     => 'salon_employees',
    'employee-services'   => 'employee_services',
    'subscriptions'       => 'subscriptions',
    'courses'             => 'courses',
    'course-categories'   => 'course_categories',
    'course-classes'      => 'course_classes',
    'course-enrollments'  => 'course_enrollments',
    'instagram-accounts'  => 'instagram_accounts',
    'instagram-messages'  => 'instagram_messages',
    'instagram-keywords'  => 'instagram_keywords',
    'loyalty-config'      => 'loyalty_config',
    'cashback-rules'      => 'cashback_rules',
    'service-packages'    => 'service_packages',
    'client-packages'     => 'client_packages',
    'waitlist-entries'    => 'waitlist_entries',
    'waitlist-settings'   => 'waitlist_settings',
    'upsell-rules'        => 'upsell_rules',
    'upsell-events'       => 'upsell_events',
    'feature-flags'       => 'feature_flags',
    'payment-config'      => 'payment_config',
    'chat-messages'       => 'chat_messages',
];

foreach ($crudRoutes as $route => $table) {
    $ctrl = new Core\CrudController($table);

    $router->get("/{$route}", fn() => $ctrl->list());
    $router->get("/{$route}/{id}", fn($p) => $ctrl->get($p['id']));
    $router->post("/{$route}", fn() => $ctrl->create(Core\Request::json()));
    $router->put("/{$route}/{id}", fn($p) => $ctrl->update($p['id'], Core\Request::json()));
    $router->delete("/{$route}/{id}", fn($p) => $ctrl->delete($p['id']));
}

// ============================================
// PUBLIC ROUTES (no auth)
// ============================================
$router->get('/public/professional/{slug}', function ($params) {
    $db = Core\Database::getInstance();
    $stmt = $db->prepare('SELECT id, name, business_name, slug, bio, primary_color, logo_url, cover_url, bg_color, text_color, component_color, welcome_title, welcome_description, avatar_url, booking_advance_weeks FROM professionals WHERE slug = ?');
    $stmt->execute([$params['slug']]);
    $prof = $stmt->fetch();
    if (!$prof) {
        Core\Response::error('Not found', 404);
        return;
    }
    Core\Response::success($prof);
});

$router->get('/public/services/{professionalId}', function ($params) {
    $db = Core\Database::getInstance();
    $stmt = $db->prepare('SELECT id, name, description, category, price, duration_minutes FROM services WHERE professional_id = ? AND active = 1 ORDER BY sort_order');
    $stmt->execute([$params['professionalId']]);
    Core\Response::success($stmt->fetchAll());
});

$router->get('/public/working-hours/{professionalId}', function ($params) {
    $db = Core\Database::getInstance();
    $stmt = $db->prepare('SELECT day_of_week, start_time, end_time FROM working_hours WHERE professional_id = ? AND is_active = 1');
    $stmt->execute([$params['professionalId']]);
    Core\Response::success($stmt->fetchAll());
});

$router->get('/public/reviews/{professionalId}', function ($params) {
    $db = Core\Database::getInstance();
    $stmt = $db->prepare('SELECT client_name, rating, comment, created_at FROM reviews WHERE professional_id = ? AND is_public = 1 ORDER BY created_at DESC LIMIT 50');
    $stmt->execute([$params['professionalId']]);
    Core\Response::success($stmt->fetchAll());
});

$router->post('/public/booking', function () {
    $data = Core\Request::json();
    $db = Core\Database::getInstance();

    $profId = $data['professional_id'] ?? '';
    $serviceId = $data['service_id'] ?? '';
    $startTime = $data['start_time'] ?? '';
    $clientName = $data['client_name'] ?? '';
    $clientPhone = $data['client_phone'] ?? '';

    if (!$profId || !$serviceId || !$startTime || !$clientName || !$clientPhone) {
        Core\Response::error('Missing required fields');
        return;
    }

    // Get service
    $stmt = $db->prepare('SELECT * FROM services WHERE id = ? AND professional_id = ? AND active = 1');
    $stmt->execute([$serviceId, $profId]);
    $service = $stmt->fetch();
    if (!$service) {
        Core\Response::error('Serviço não encontrado');
        return;
    }

    $endTime = date('Y-m-d H:i:s', strtotime($startTime) + ($service['duration_minutes'] * 60));

    // Check conflicts
    $stmt = $db->prepare("SELECT COUNT(*) as cnt FROM bookings WHERE professional_id = ? AND status != 'cancelled' AND (? < end_time AND ? > start_time)");
    $stmt->execute([$profId, $startTime, $endTime]);
    if ($stmt->fetch()['cnt'] > 0) {
        Core\Response::error('Horário já ocupado');
        return;
    }

    // Find or create client
    $stmt = $db->prepare('SELECT id FROM clients WHERE professional_id = ? AND phone = ? LIMIT 1');
    $stmt->execute([$profId, $clientPhone]);
    $client = $stmt->fetch();
    $clientId = $client['id'] ?? null;

    if (!$clientId) {
        $clientId = Core\Database::uuid();
        $stmt = $db->prepare('INSERT INTO clients (id, professional_id, name, phone) VALUES (?, ?, ?, ?)');
        $stmt->execute([$clientId, $profId, $clientName, $clientPhone]);
    }

    $bookingId = Core\Database::uuid();
    $stmt = $db->prepare('INSERT INTO bookings (id, professional_id, client_id, service_id, start_time, end_time, status, price, duration_minutes, client_name, client_phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([$bookingId, $profId, $clientId, $serviceId, $startTime, $endTime, 'pending', $service['price'], $service['duration_minutes'], $clientName, $clientPhone]);

    Core\Response::success(['booking_id' => $bookingId, 'price' => $service['price']], 201);
});

// ============================================
// SUBSCRIPTION CHECK
// ============================================
$router->get('/subscription', function () {
    $user = Core\Auth::requireAuth();
    $profId = Core\Auth::getProfessionalId($user['sub']);
    $db = Core\Database::getInstance();

    $stmt = $db->prepare('SELECT * FROM subscriptions WHERE professional_id = ? ORDER BY created_at DESC LIMIT 1');
    $stmt->execute([$profId]);
    $sub = $stmt->fetch();

    if (!$sub) {
        Core\Response::success(['subscribed' => false, 'plan' => 'none']);
        return;
    }

    $isActive = $sub['status'] === 'active' && ($sub['current_period_end'] === null || strtotime($sub['current_period_end']) > time());

    Core\Response::success([
        'subscribed'       => $isActive,
        'plan'             => $sub['plan_id'],
        'subscription_end' => $sub['current_period_end'],
    ]);
});

// ============================================
// DASHBOARD STATS
// ============================================
$router->get('/dashboard/stats', function () {
    $user = Core\Auth::requireAuth();
    $profId = Core\Auth::getProfessionalId($user['sub']);
    $db = Core\Database::getInstance();

    $today = date('Y-m-d');
    $monthStart = date('Y-m-01');

    // Today's bookings
    $stmt = $db->prepare("SELECT COUNT(*) as cnt FROM bookings WHERE professional_id = ? AND DATE(start_time) = ? AND status != 'cancelled'");
    $stmt->execute([$profId, $today]);
    $todayBookings = $stmt->fetch()['cnt'];

    // Month revenue
    $stmt = $db->prepare("SELECT COALESCE(SUM(price), 0) as total FROM bookings WHERE professional_id = ? AND DATE(start_time) >= ? AND status = 'completed'");
    $stmt->execute([$profId, $monthStart]);
    $monthRevenue = $stmt->fetch()['total'];

    // Total clients
    $stmt = $db->prepare('SELECT COUNT(*) as cnt FROM clients WHERE professional_id = ?');
    $stmt->execute([$profId]);
    $totalClients = $stmt->fetch()['cnt'];

    // Total services
    $stmt = $db->prepare('SELECT COUNT(*) as cnt FROM services WHERE professional_id = ? AND active = 1');
    $stmt->execute([$profId]);
    $totalServices = $stmt->fetch()['cnt'];

    Core\Response::success([
        'today_bookings' => (int) $todayBookings,
        'month_revenue'  => (float) $monthRevenue,
        'total_clients'  => (int) $totalClients,
        'total_services' => (int) $totalServices,
    ]);
});

// ============================================
// ADMIN ROUTES
// ============================================
$router->get('/admin/professionals', function () {
    Core\Auth::requireAdmin();
    $db = Core\Database::getInstance();
    $stmt = $db->query('SELECT p.*, s.plan_id, s.status as sub_status, s.current_period_end FROM professionals p LEFT JOIN subscriptions s ON s.professional_id = p.id ORDER BY p.created_at DESC');
    Core\Response::success($stmt->fetchAll());
});

$router->put('/admin/professionals/{id}/block', function ($params) {
    Core\Auth::requireAdmin();
    $data = Core\Request::json();
    $db = Core\Database::getInstance();
    $stmt = $db->prepare('UPDATE professionals SET is_blocked = ?, blocked_reason = ? WHERE id = ?');
    $stmt->execute([$data['blocked'] ? 1 : 0, $data['reason'] ?? '', $params['id']]);
    Core\Response::success();
});

$router->get('/admin/users', function () {
    Core\Auth::requireAdmin();
    $db = Core\Database::getInstance();
    $stmt = $db->query('SELECT u.id, u.email, u.created_at, GROUP_CONCAT(ur.role) as roles FROM users u LEFT JOIN user_roles ur ON ur.user_id = u.id GROUP BY u.id ORDER BY u.created_at DESC');
    Core\Response::success($stmt->fetchAll());
});

// ============================================
// WHATSAPP SEND (Evolution API)
// ============================================
$router->post('/whatsapp/send', function () {
    $user = Core\Auth::requireAuth();
    $data = Core\Request::json();
    $config = require __DIR__ . '/config/app.php';

    $profId = Core\Auth::getProfessionalId($user['sub']);
    $db = Core\Database::getInstance();

    // Get instance
    $stmt = $db->prepare("SELECT instance_name FROM whatsapp_instances WHERE professional_id = ? AND status = 'connected' LIMIT 1");
    $stmt->execute([$profId]);
    $instance = $stmt->fetch();

    if (!$instance) {
        Core\Response::error('No connected WhatsApp instance');
        return;
    }

    $phone = $data['phone'] ?? '';
    $message = $data['message'] ?? '';

    // Try Evolution API first
    $ch = curl_init("{$config['evolution_api_url']}/message/sendText/{$instance['instance_name']}");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            "apikey: {$config['evolution_api_key']}",
        ],
        CURLOPT_POSTFIELDS => json_encode(['number' => $phone, 'text' => $message]),
        CURLOPT_TIMEOUT => 10,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $provider = 'evolution';
    $success = $httpCode >= 200 && $httpCode < 300;

    // Fallback to Meta Cloud API if Evolution fails
    if (!$success && $config['meta_app_id']) {
        $provider = 'meta_cloud';
        // Meta Cloud API fallback would go here
        // Requires WHATSAPP_PHONE_NUMBER_ID and META_ACCESS_TOKEN
    }

    // Log
    $stmt = $db->prepare('INSERT INTO whatsapp_logs (id, professional_id, phone, message_type, status, metadata) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        Core\Database::uuid(), $profId, $phone, 'manual',
        $success ? 'sent' : 'failed',
        json_encode(['provider' => $provider, 'http_code' => $httpCode])
    ]);

    if ($success) {
        Core\Response::success(['provider' => $provider]);
    } else {
        Core\Response::error('Failed to send message', 502);
    }
});

// Dispatch
$router->dispatch();
