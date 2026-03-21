<?php
/**
 * Upsell Suggestions (AI + Rules)
 * Replaces: supabase/functions/upsell-suggest/index.ts
 */

namespace Api;

use Core\Database;
use Core\Response;

class Upsell
{
    public function suggest(array $data): void
    {
        $db = Database::getInstance();
        $profId = $data['professionalId'] ?? '';
        $sourceServiceId = $data['sourceServiceId'] ?? '';

        if (!$profId || !$sourceServiceId) { Response::error('Missing params', 400); return; }

        // Check feature flags
        $stmt = $db->prepare('SELECT enabled FROM professional_feature_overrides WHERE professional_id = ? AND feature_key = ?');
        $stmt->execute([$profId, 'upsell_inteligente']);
        $override = $stmt->fetch();
        if ($override && !$override['enabled']) { Response::success(['suggestions' => []]); return; }

        $stmt = $db->prepare("SELECT enabled FROM feature_flags WHERE `key` = ?");
        $stmt->execute(['upsell_inteligente']);
        $flag = $stmt->fetch();
        if (!$flag || !$flag['enabled']) { Response::success(['suggestions' => []]); return; }

        // Get rules
        $stmt = $db->prepare('SELECT ur.*, s.id as rec_id, s.name as rec_name, s.price as rec_price, s.duration_minutes as rec_duration FROM upsell_rules ur LEFT JOIN services s ON s.id = ur.recommended_service_id WHERE ur.professional_id = ? AND ur.source_service_id = ? AND ur.is_active = 1 ORDER BY ur.priority LIMIT 3');
        $stmt->execute([$profId, $sourceServiceId]);
        $rules = $stmt->fetchAll();

        if ($rules) {
            $suggestions = array_map(fn($r) => [
                'service' => ['id' => $r['rec_id'], 'name' => $r['rec_name'], 'price' => $r['rec_price'], 'duration_minutes' => $r['rec_duration']],
                'promo_message' => $r['promo_message'], 'promo_price' => $r['promo_price'],
            ], $rules);
            Response::success(['suggestions' => $suggestions, 'source' => 'rules']);
            return;
        }

        // AI-based suggestion
        $config = require __DIR__ . '/../config/app.php';
        $apiKey = $config['gemini_api_key'] ?? '';
        if (!$apiKey) { Response::success(['suggestions' => []]); return; }

        $stmt = $db->prepare('SELECT name, price FROM services WHERE id = ?');
        $stmt->execute([$sourceServiceId]);
        $source = $stmt->fetch();

        $stmt = $db->prepare('SELECT id, name, price, duration_minutes FROM services WHERE professional_id = ? AND active = 1 AND id != ?');
        $stmt->execute([$profId, $sourceServiceId]);
        $services = $stmt->fetchAll();
        if (!$services || !$source) { Response::success(['suggestions' => []]); return; }

        $svcList = implode("\n", array_map(fn($s) => "- {$s['name']} (R\$ " . number_format($s['price'], 2) . ", {$s['duration_minutes']} min, ID: {$s['id']})", $services));
        $prompt = "Cliente agendou \"{$source['name']}\" (R\$ {$source['price']}). Sugira até 2 serviços complementares.\nServiços:\n{$svcList}\n\nResponda JSON array: [{\"service_id\":\"uuid\",\"message\":\"frase de upsell\"}]";

        $ch = curl_init('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json', "Authorization: Bearer {$apiKey}"],
            CURLOPT_POSTFIELDS => json_encode(['model' => 'gemini-2.5-flash', 'messages' => [['role' => 'user', 'content' => $prompt]]]),
        ]);
        $aiData = json_decode(curl_exec($ch), true);
        curl_close($ch);

        $content = $aiData['choices'][0]['message']['content'] ?? '';
        preg_match('/\[.*\]/s', $content, $m);
        $aiSuggestions = json_decode($m[0] ?? '[]', true) ?: [];

        $enriched = array_filter(array_map(function ($s) use ($services) {
            $svc = array_filter($services, fn($sv) => $sv['id'] === $s['service_id']);
            $svc = array_values($svc)[0] ?? null;
            return $svc ? ['service' => $svc, 'promo_message' => $s['message'], 'promo_price' => null] : null;
        }, $aiSuggestions));

        Response::success(['suggestions' => array_values($enriched), 'source' => 'ai']);
    }
}
