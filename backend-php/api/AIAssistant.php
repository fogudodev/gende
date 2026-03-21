<?php
/**
 * AI Salon Assistant (Lis)
 * Replaces: supabase/functions/salon-ai-assistant/index.ts
 * Uses Google Gemini API directly (requires GEMINI_API_KEY in .env)
 */

namespace Api;

use Core\Auth;
use Core\Database;
use Core\Response;

class AIAssistant
{
    public function handle(array $data): void
    {
        $user = Auth::requireAuth();
        $db = Database::getInstance();
        $config = require __DIR__ . '/../config/app.php';
        $apiKey = $config['gemini_api_key'] ?? '';

        if (!$apiKey) { Response::error('Chave da IA não configurada'); return; }

        $messages = $data['messages'] ?? [];

        $stmt = $db->prepare('SELECT * FROM professionals WHERE user_id = ?');
        $stmt->execute([$user['sub']]);
        $professional = $stmt->fetch();
        if (!$professional) { Response::error('Profissional não encontrado', 404); return; }

        $pid = $professional['id'];

        // Fetch business data
        $stmt = $db->prepare("SELECT * FROM bookings WHERE professional_id = ? ORDER BY start_time LIMIT 1000");
        $stmt->execute([$pid]);
        $bookings = $stmt->fetchAll();

        $stmt = $db->prepare('SELECT * FROM clients WHERE professional_id = ?');
        $stmt->execute([$pid]);
        $clients = $stmt->fetchAll();

        $stmt = $db->prepare('SELECT * FROM services WHERE professional_id = ?');
        $stmt->execute([$pid]);
        $services = $stmt->fetchAll();

        $stmt = $db->prepare('SELECT * FROM salon_employees WHERE salon_id = ?');
        $stmt->execute([$pid]);
        $employees = $stmt->fetchAll();

        $stmt = $db->prepare('SELECT * FROM expenses WHERE professional_id = ? ORDER BY expense_date LIMIT 1000');
        $stmt->execute([$pid]);
        $expenses = $stmt->fetchAll();

        $stmt = $db->prepare('SELECT plan_id, status FROM subscriptions WHERE professional_id = ? ORDER BY created_at DESC LIMIT 1');
        $stmt->execute([$pid]);
        $subscription = $stmt->fetch();

        // Build stats
        $totalRevenue = 0; $completedCount = 0; $cancelledCount = 0;
        foreach ($bookings as $b) {
            if ($b['status'] === 'completed') { $totalRevenue += (float)$b['price']; $completedCount++; }
            if ($b['status'] === 'cancelled') $cancelledCount++;
        }
        $totalExpenses = array_sum(array_map(fn($e) => (float)$e['amount'], $expenses));
        $avgTicket = $completedCount > 0 ? $totalRevenue / $completedCount : 0;

        $serviceAnalysis = [];
        foreach ($bookings as $b) {
            if (!$b['service_id']) continue;
            if (!isset($serviceAnalysis[$b['service_id']])) $serviceAnalysis[$b['service_id']] = ['count' => 0, 'revenue' => 0];
            $serviceAnalysis[$b['service_id']]['count']++;
            if ($b['status'] === 'completed') $serviceAnalysis[$b['service_id']]['revenue'] += (float)$b['price'];
        }

        $serviceStr = '';
        foreach ($serviceAnalysis as $sid => $stats) {
            $svc = array_filter($services, fn($s) => $s['id'] === $sid);
            $svc = array_values($svc)[0] ?? null;
            $name = $svc['name'] ?? $sid;
            $serviceStr .= "- {$name}: {$stats['count']} agend. | R$" . number_format($stats['revenue'], 0) . " receita\n";
        }

        $ownerName = explode(' ', $professional['name'] ?? '')[0];
        $businessContext = "## PERFIL
- Nome: " . ($professional['business_name'] ?: $professional['name']) . "
- Plano: " . ($subscription['plan_id'] ?? 'Nenhum') . "

## RESUMO GERAL
- Faturamento: R$ " . number_format($totalRevenue, 2) . "
- Despesas: R$ " . number_format($totalExpenses, 2) . "
- Lucro bruto: R$ " . number_format($totalRevenue - $totalExpenses, 2) . "
- Total agendamentos: " . count($bookings) . " | Concluídos: {$completedCount} | Cancelados: {$cancelledCount}
- Ticket médio: R$ " . number_format($avgTicket, 2) . "
- Clientes cadastrados: " . count($clients) . "

## SERVIÇOS
{$serviceStr}

## EQUIPE ({employeeCount} membros)
" . implode("\n", array_map(fn($e) => "- {$e['name']} ({$e['specialty']})", $employees));

        $systemPrompt = "Você é a **Lis**, consultora especialista em crescimento para negócios de beleza. Trate o dono como {$ownerName}.

## REGRAS
- CONCISA: máx 300 palavras
- Baseie-se APENAS nos dados reais fornecidos
- Inclua IMPACTO FINANCEIRO das sugestões
- Português brasileiro
- Emojis moderados

{$businessContext}";

        // Call Gemini API (streaming)
        $payload = [
            'model' => 'gemini-2.5-flash',
            'messages' => array_merge(
                [['role' => 'system', 'content' => $systemPrompt]],
                $messages
            ),
            'stream' => true,
        ];

        $ch = curl_init('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions');
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json', "Authorization: Bearer {$apiKey}"],
            CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_WRITEFUNCTION => function ($ch, $data) {
                echo $data;
                if (ob_get_level()) ob_flush();
                flush();
                return strlen($data);
            },
        ]);

        header('Content-Type: text/event-stream');
        header('Cache-Control: no-cache');
        header('Access-Control-Allow-Origin: *');
        curl_exec($ch);
        curl_close($ch);
        exit;
    }
}
