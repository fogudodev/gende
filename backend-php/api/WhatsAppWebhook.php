<?php
/**
 * WhatsApp Webhook + AI Bot
 * Replaces: supabase/functions/whatsapp-webhook/index.ts
 * NOTE: AI calls use Google Gemini API directly (requires GEMINI_API_KEY in .env)
 */

namespace Api;

use Core\Database;
use Core\Response;

class WhatsAppWebhook
{
    private \PDO $db;
    private WhatsApp $whatsapp;

    public function __construct()
    {
        $this->db = Database::getInstance();
        $this->whatsapp = new WhatsApp();
    }

    public function handle(array $body): void
    {
        // Handle follow-up action
        if (($body['action'] ?? '') === 'send-follow-up') {
            $this->handleFollowUp($body);
            return;
        }

        $webhookData = $body['data'] ?? $body;
        $event = $webhookData['event'] ?? $body['event'] ?? '';

        if ($event !== 'messages.upsert') {
            Response::success(['success' => true]);
            return;
        }

        $messageData = $webhookData['data'] ?? $webhookData;
        $instanceName = $webhookData['instance'] ?? $body['instance'] ?? $messageData['instance'] ?? '';
        $message = $messageData['message'] ?? $messageData;
        $key = $message['key'] ?? $messageData['key'] ?? [];

        if ($key['fromMe'] ?? false) { Response::success(['success' => true]); return; }

        $remoteJid = $key['remoteJid'] ?? '';
        $clientPhone = str_replace(['@s.whatsapp.net', '@g.us'], '', $remoteJid);
        if (str_contains($remoteJid, '@g.us')) { Response::success(['success' => true]); return; }
        if (!$clientPhone || !$instanceName) { Response::error('Missing data', 400); return; }

        // Extract text
        $msgContent = $message['message'] ?? $messageData['message'] ?? [];
        $clientMessage = $msgContent['conversation'] ?? $msgContent['extendedTextMessage']['text'] ?? '';
        if ($msgContent['audioMessage'] ?? false) $clientMessage = '[Áudio - envie texto por favor]';
        if ($msgContent['imageMessage'] ?? $msgContent['videoMessage'] ?? $msgContent['documentMessage'] ?? false) {
            $clientMessage = '[Mídia recebida - por favor envie uma mensagem de texto]';
        }
        if (!$clientMessage) { Response::success(['success' => true]); return; }

        // Find professional
        $stmt = $this->db->prepare('SELECT professional_id, instance_name, status FROM whatsapp_instances WHERE instance_name = ? LIMIT 1');
        $stmt->execute([$instanceName]);
        $instance = $stmt->fetch();
        if (!$instance) { Response::error('Instance not found'); return; }

        $professionalId = $instance['professional_id'];

        $stmt = $this->db->prepare('SELECT id, name, business_name, slug, welcome_message, feature_whatsapp FROM professionals WHERE id = ?');
        $stmt->execute([$professionalId]);
        $professional = $stmt->fetch();
        if (!$professional || !$professional['feature_whatsapp']) { Response::success(['success' => true]); return; }

        $bookingLink = $professional['slug'] ? "https://gende.io/{$professional['slug']}" : '';

        // Get existing conversation
        $stmt = $this->db->prepare("SELECT * FROM whatsapp_conversations WHERE professional_id = ? AND client_phone = ? AND status = 'active' LIMIT 1");
        $stmt->execute([$professionalId, $clientPhone]);
        $existingConv = $stmt->fetch();

        // Get services
        $stmt = $this->db->prepare('SELECT id, name, price, duration_minutes, description, category FROM services WHERE professional_id = ? AND active = 1 ORDER BY sort_order');
        $stmt->execute([$professionalId]);
        $services = $stmt->fetchAll();

        // Get working hours
        $stmt = $this->db->prepare('SELECT day_of_week, start_time, end_time, is_active FROM working_hours WHERE professional_id = ? ORDER BY day_of_week');
        $stmt->execute([$professionalId]);
        $workingHours = $stmt->fetchAll();

        if (!$services) {
            $welcomeMsg = "Olá! 👋 Bem-vindo(a) ao " . ($professional['business_name'] ?: $professional['name']) . "!\n\nNo momento não temos serviços disponíveis. Entre em contato diretamente. 😊";
            $this->whatsapp->sendMessage($instanceName, $clientPhone, $welcomeMsg);
            Response::success(['success' => true]);
            return;
        }

        if (!$existingConv) {
            // First message - send welcome and create conversation
            $profName = $professional['business_name'] ?: $professional['name'];
            $welcomeText = $professional['welcome_message'] ?: "Olá! 👋 Bem-vindo(a) ao *{$profName}*! Ficamos felizes em atendê-lo(a)! 😊";
            if ($bookingLink) $welcomeText .= "\n\n📱 Agende também pela nossa página: {$bookingLink}";
            $welcomeText .= "\n\nSe quiser continuar por aqui, é só me dizer o que gostaria. 😊";

            $this->whatsapp->sendMessage($instanceName, $clientPhone, $welcomeText);

            $messages = [
                ['role' => 'user', 'content' => $clientMessage],
                ['role' => 'assistant', 'content' => $welcomeText],
            ];
            $context = ['client_phone' => $clientPhone];

            $stmt = $this->db->prepare('INSERT INTO whatsapp_conversations (id, professional_id, client_phone, messages, context, status) VALUES (?, ?, ?, ?, ?, ?)');
            $stmt->execute([Database::uuid(), $professionalId, $clientPhone, json_encode($messages), json_encode($context), 'active']);
        } else {
            $context = json_decode($existingConv['context'] ?? '{}', true) ?: [];
            $conversationMessages = json_decode($existingConv['messages'] ?? '[]', true) ?: [];
            $conversationMessages[] = ['role' => 'user', 'content' => $clientMessage];

            // Get available slots if service and date selected
            $availableSlots = null;
            if (!empty($context['selected_service']) && !empty($context['selected_date'])) {
                $availableSlots = $this->getAvailableSlots($professionalId, $context['selected_service'], $context['selected_date']);
            }

            // Get AI response
            $systemPrompt = $this->buildSystemPrompt($professional, $services, $availableSlots, $context, $bookingLink, $workingHours);
            $aiResponse = $this->getAIResponse($conversationMessages, $systemPrompt);

            // Check for booking intent
            if (preg_match('/\|\|\|BOOKING\|\|\|(.+?)\|\|\|END\|\|\|/', $aiResponse, $bookingMatch)) {
                $bookingData = json_decode($bookingMatch[1], true);
                if ($bookingData) {
                    $this->processBooking($bookingData, $professionalId, $instanceName, $clientPhone, $aiResponse, $conversationMessages, $context, $existingConv);
                    return;
                }
            }

            // Update context from message
            $this->updateContext($context, $clientMessage, $services);

            // If we now have service + date, get slots and re-query AI
            if (!empty($context['selected_service']) && !empty($context['selected_date']) && !$availableSlots) {
                $availableSlots = $this->getAvailableSlots($professionalId, $context['selected_service'], $context['selected_date']);
                $systemPrompt = $this->buildSystemPrompt($professional, $services, $availableSlots, $context, $bookingLink, $workingHours);
                $aiResponse = $this->getAIResponse($conversationMessages, $systemPrompt);

                if (preg_match('/\|\|\|BOOKING\|\|\|(.+?)\|\|\|END\|\|\|/', $aiResponse, $bookingMatch)) {
                    $bookingData = json_decode($bookingMatch[1], true);
                    if ($bookingData) {
                        $this->processBooking($bookingData, $professionalId, $instanceName, $clientPhone, $aiResponse, $conversationMessages, $context, $existingConv);
                        return;
                    }
                }
            }

            // Send regular AI response
            $cleanResponse = preg_replace('/\|\|\|BOOKING\|\|\|.+?\|\|\|END\|\|\|/', '', $aiResponse);
            $cleanResponse = trim($cleanResponse);
            $this->whatsapp->sendMessage($instanceName, $clientPhone, $cleanResponse);

            $conversationMessages[] = ['role' => 'assistant', 'content' => $cleanResponse];
            $stmt = $this->db->prepare('UPDATE whatsapp_conversations SET messages = ?, context = ?, updated_at = NOW() WHERE id = ?');
            $stmt->execute([json_encode($conversationMessages), json_encode($context), $existingConv['id']]);
        }

        Response::success(['success' => true]);
    }

    private function processBooking(array $bookingData, string $professionalId, string $instanceName, string $clientPhone, string $aiResponse, array $conversationMessages, array $context, array $conv): void
    {
        $startTime = new \DateTime("{$bookingData['date']}T{$bookingData['time']}:00", new \DateTimeZone('America/Sao_Paulo'));

        // Get service
        $stmt = $this->db->prepare('SELECT * FROM services WHERE id = ? AND professional_id = ? AND active = 1');
        $stmt->execute([$bookingData['service_id'], $professionalId]);
        $service = $stmt->fetch();

        if (!$service) {
            $this->whatsapp->sendMessage($instanceName, $clientPhone, '❌ Serviço não encontrado. Tente novamente.');
            Response::success(['success' => true]);
            return;
        }

        $endTime = (clone $startTime)->modify("+{$service['duration_minutes']} minutes");
        $clientName = $bookingData['client_name'] ?? 'Cliente';
        $bookingPhone = WhatsApp::normalizePhone($bookingData['client_phone'] ?? $clientPhone);

        // Check conflict
        $stmt = $this->db->prepare("SELECT COUNT(*) as cnt FROM bookings WHERE professional_id = ? AND status != 'cancelled' AND (? < end_time AND ? > start_time)");
        $stmt->execute([$professionalId, $startTime->format('Y-m-d H:i:s'), $endTime->format('Y-m-d H:i:s')]);
        if ($stmt->fetch()['cnt'] > 0) {
            $this->whatsapp->sendMessage($instanceName, $clientPhone, '❌ Horário já ocupado. Tente outro horário.');
            Response::success(['success' => true]);
            return;
        }

        // Find or create client
        $stmt = $this->db->prepare('SELECT id FROM clients WHERE professional_id = ? AND phone = ? LIMIT 1');
        $stmt->execute([$professionalId, $bookingPhone]);
        $client = $stmt->fetch();
        $clientId = $client['id'] ?? null;
        if (!$clientId) {
            $clientId = Database::uuid();
            $stmt = $this->db->prepare('INSERT INTO clients (id, professional_id, name, phone) VALUES (?, ?, ?, ?)');
            $stmt->execute([$clientId, $professionalId, $clientName, $bookingPhone]);
        }

        // Create booking
        $bookingId = Database::uuid();
        $stmt = $this->db->prepare('INSERT INTO bookings (id, professional_id, client_id, service_id, start_time, end_time, status, price, duration_minutes, client_name, client_phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([$bookingId, $professionalId, $clientId, $bookingData['service_id'], $startTime->format('Y-m-d H:i:s'), $endTime->format('Y-m-d H:i:s'), 'pending', $service['price'], $service['duration_minutes'], $clientName, $bookingPhone]);

        $friendlyMsg = trim(preg_replace('/\|\|\|BOOKING\|\|\|.+?\|\|\|END\|\|\|/', '', $aiResponse));
        if (!$friendlyMsg) {
            $friendlyMsg = "✅ Seu agendamento foi confirmado!\n\n📅 Data: {$bookingData['date']}\n⏰ Horário: {$bookingData['time']}\n💰 Valor: R$ " . number_format($service['price'], 2, ',', '.') . "\n\nAgradecemos pela preferência! 😊";
        }

        $this->whatsapp->sendMessage($instanceName, $clientPhone, $friendlyMsg);

        // Close conversation
        $conversationMessages[] = ['role' => 'assistant', 'content' => $friendlyMsg];
        $context['booking_id'] = $bookingId;
        $stmt = $this->db->prepare("UPDATE whatsapp_conversations SET status = 'completed', messages = ?, context = ? WHERE id = ?");
        $stmt->execute([json_encode($conversationMessages), json_encode($context), $conv['id']]);

        // Log
        $stmt = $this->db->prepare('INSERT INTO whatsapp_logs (id, professional_id, booking_id, recipient_phone, message_content, status, sent_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([Database::uuid(), $professionalId, $bookingId, $clientPhone, $friendlyMsg, 'sent', date('c')]);

        // Trigger booking_created automation
        $this->whatsapp->triggerAutomation(['professionalId' => $professionalId, 'bookingId' => $bookingId, 'triggerType' => 'booking_created']);

        Response::success(['success' => true]);
    }

    private function getAvailableSlots(string $professionalId, string $serviceId, string $date): ?array
    {
        $stmt = $this->db->prepare('SELECT duration_minutes FROM services WHERE id = ? AND professional_id = ?');
        $stmt->execute([$serviceId, $professionalId]);
        $service = $stmt->fetch();
        if (!$service) return null;

        $dow = (int)(new \DateTime($date))->format('w');
        $stmt = $this->db->prepare('SELECT start_time, end_time FROM working_hours WHERE professional_id = ? AND day_of_week = ? AND is_active = 1');
        $stmt->execute([$professionalId, $dow]);
        $wh = $stmt->fetch();
        if (!$wh) return [];

        $slots = [];
        $current = new \DateTime("{$date} {$wh['start_time']}", new \DateTimeZone('America/Sao_Paulo'));
        $endOfDay = new \DateTime("{$date} {$wh['end_time']}", new \DateTimeZone('America/Sao_Paulo'));
        $duration = $service['duration_minutes'];

        while ((clone $current)->modify("+{$duration} minutes") <= $endOfDay) {
            $slotEnd = (clone $current)->modify("+{$duration} minutes");

            // Check conflicts
            $stmt = $this->db->prepare("SELECT COUNT(*) as cnt FROM bookings WHERE professional_id = ? AND status != 'cancelled' AND (? < end_time AND ? > start_time)");
            $stmt->execute([$professionalId, $current->format('Y-m-d H:i:s'), $slotEnd->format('Y-m-d H:i:s')]);
            $conflicts = $stmt->fetch()['cnt'];

            $stmt = $this->db->prepare('SELECT COUNT(*) as cnt FROM blocked_times WHERE professional_id = ? AND (? < end_time AND ? > start_time)');
            $stmt->execute([$professionalId, $current->format('Y-m-d H:i:s'), $slotEnd->format('Y-m-d H:i:s')]);
            $blocked = $stmt->fetch()['cnt'];

            if ($conflicts == 0 && $blocked == 0) {
                $slots[] = ['start_time' => $current->format('c'), 'end_time' => $slotEnd->format('c')];
            }
            $current->modify('+30 minutes');
        }
        return $slots;
    }

    private function getAIResponse(array $messages, string $systemPrompt): string
    {
        $config = require __DIR__ . '/../config/app.php';
        $apiKey = $config['gemini_api_key'] ?? '';
        if (!$apiKey) return 'Desculpe, o assistente está indisponível no momento.';

        $payload = [
            'model' => 'gemini-2.5-flash',
            'messages' => array_merge(
                [['role' => 'system', 'content' => $systemPrompt]],
                array_map(fn($m) => ['role' => $m['role'], 'content' => $m['content']], $messages)
            ),
        ];

        // Use OpenAI-compatible endpoint for Gemini
        $ch = curl_init('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json', "Authorization: Bearer {$apiKey}"],
            CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_TIMEOUT => 30,
        ]);
        $response = curl_exec($ch);
        curl_close($ch);

        $data = json_decode($response, true);
        return $data['choices'][0]['message']['content'] ?? 'Desculpe, não entendi. Pode repetir?';
    }

    private function buildSystemPrompt(array $professional, array $services, ?array $availableSlots, array $context, string $bookingLink, array $workingHours): string
    {
        $profName = $professional['business_name'] ?: $professional['name'];
        $now = new \DateTime('now', new \DateTimeZone('America/Sao_Paulo'));
        $todayISO = $now->format('Y-m-d');
        $nowFormatted = $now->format('l, d/m/Y');

        $servicesText = implode("\n", array_map(fn($s, $i) =>
            ($i + 1) . ". {$s['name']} (ID: {$s['id']}) - R$ " . number_format($s['price'], 2, '.', '') . " ({$s['duration_minutes']} min)" . ($s['description'] ? " - {$s['description']}" : ''),
            $services, array_keys($services)
        ));

        $slotsText = '';
        if ($availableSlots && count($availableSlots) > 0) {
            $slotsText = "\n\nHorários disponíveis para " . ($context['selected_date'] ?? '') . ":\n" .
                implode(', ', array_map(fn($s) => (new \DateTime($s['start_time']))->setTimezone(new \DateTimeZone('America/Sao_Paulo'))->format('H:i'), $availableSlots));
        }

        $dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
        $whText = "HORÁRIOS DE FUNCIONAMENTO:\n";
        foreach (range(0, 6) as $d) {
            $wh = array_filter($workingHours, fn($h) => (int)$h['day_of_week'] === $d && $h['is_active']);
            $wh = array_values($wh);
            $whText .= $wh ? "- {$dayNames[$d]}: " . substr($wh[0]['start_time'], 0, 5) . " às " . substr($wh[0]['end_time'], 0, 5) . "\n" : "- {$dayNames[$d]}: NÃO TRABALHA\n";
        }

        return "Você é um assistente de agendamento virtual do \"{$profName}\". Seja simpático, objetivo e profissional. Fale em português brasileiro.

DATA E HORA ATUAL: {$nowFormatted} ({$todayISO})

REGRAS IMPORTANTES:
- Guie: escolher serviço → data → horário → confirmar nome e telefone.
- Quando confirmado: |||BOOKING|||{\"service_id\":\"<UUID>\",\"date\":\"<YYYY-MM-DD>\",\"time\":\"<HH:MM>\",\"client_name\":\"<nome>\",\"client_phone\":\"<telefone>\"}|||END|||
- O service_id DEVE ser o UUID da lista. NUNCA invente horários.

SERVIÇOS:
{$servicesText}

{$whText}
{$slotsText}

CONTEXTO:
- Serviço: " . ($context['selected_service'] ?? 'nenhum') . "
- Data: " . ($context['selected_date'] ?? 'nenhuma') . "
- Nome: " . ($context['client_name'] ?? 'não informado') . "

LINK: {$bookingLink}";
    }

    private function updateContext(array &$context, string $message, array $services): void
    {
        $lower = mb_strtolower($message);
        foreach ($services as $svc) {
            if (str_contains($lower, mb_strtolower($svc['name']))) {
                $context['selected_service'] = $svc['id'];
                break;
            }
        }

        if (preg_match('/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/', $message, $m)) {
            $day = str_pad($m[1], 2, '0', STR_PAD_LEFT);
            $month = str_pad($m[2], 2, '0', STR_PAD_LEFT);
            $year = isset($m[3]) ? (strlen($m[3]) === 2 ? '20' . $m[3] : $m[3]) : date('Y');
            $context['selected_date'] = "{$year}-{$month}-{$day}";
        }

        $now = new \DateTime('now', new \DateTimeZone('America/Sao_Paulo'));
        if (str_contains($lower, 'hoje')) {
            $context['selected_date'] = $now->format('Y-m-d');
        } elseif (str_contains($lower, 'amanhã') || str_contains($lower, 'amanha')) {
            $context['selected_date'] = (clone $now)->modify('+1 day')->format('Y-m-d');
        } else {
            $dayMap = ['domingo' => 0, 'segunda' => 1, 'terça' => 2, 'terca' => 2, 'quarta' => 3, 'quinta' => 4, 'sexta' => 5, 'sábado' => 6, 'sabado' => 6];
            foreach ($dayMap as $name => $dow) {
                if (str_contains($lower, $name)) {
                    $currentDow = (int)$now->format('w');
                    $daysAhead = $dow - $currentDow;
                    if ($daysAhead <= 0) $daysAhead += 7;
                    $context['selected_date'] = (clone $now)->modify("+{$daysAhead} days")->format('Y-m-d');
                    break;
                }
            }
        }
    }

    private function handleFollowUp(array $body): void
    {
        $conversationId = $body['conversationId'] ?? '';
        $professionalId = $body['professionalId'] ?? '';

        $stmt = $this->db->prepare('SELECT * FROM whatsapp_conversations WHERE id = ?');
        $stmt->execute([$conversationId]);
        $conv = $stmt->fetch();
        if (!$conv) { Response::error('Conversa não encontrada', 404); return; }

        $stmt = $this->db->prepare("SELECT instance_name, status FROM whatsapp_instances WHERE professional_id = ? AND status = 'connected' LIMIT 1");
        $stmt->execute([$professionalId]);
        $inst = $stmt->fetch();
        if (!$inst) { Response::error('WhatsApp não conectado', 400); return; }

        $stmt = $this->db->prepare('SELECT business_name, name, slug, followup_message FROM professionals WHERE id = ?');
        $stmt->execute([$professionalId]);
        $prof = $stmt->fetch();

        $context = json_decode($conv['context'] ?? '{}', true);
        $clientName = $context['client_name'] ?? '';
        $profName = $prof['business_name'] ?: ($prof['name'] ?? '');
        $bookingLink = $prof['slug'] ? "https://gende.io/{$prof['slug']}" : '';

        $followUpMsg = $prof['followup_message'] ?: "Olá {nome}! 👋 Notamos que você não finalizou seu agendamento no *{$profName}*.\n\nAinda gostaria de agendar? 😊";
        $followUpMsg = str_replace(['{nome}', '{link}'], [$clientName, $bookingLink], $followUpMsg);
        if ($bookingLink && !str_contains($followUpMsg, $bookingLink)) $followUpMsg .= "\n\n📱 Ou agende online: {$bookingLink}";

        $res = $this->whatsapp->sendMessage($inst['instance_name'], $conv['client_phone'], $followUpMsg);

        if ($res['ok']) {
            $msgs = json_decode($conv['messages'] ?? '[]', true) ?: [];
            $msgs[] = ['role' => 'assistant', 'content' => $followUpMsg];
            $stmt = $this->db->prepare("UPDATE whatsapp_conversations SET status = 'active', messages = ? WHERE id = ?");
            $stmt->execute([json_encode($msgs), $conversationId]);
        }

        Response::success(['success' => $res['ok']]);
    }
    /**
     * Handle incoming webhooks from Meta Cloud API
     * Endpoint: POST /whatsapp/meta-webhook
     */
    public function handleMetaWebhook(): void
    {
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        // Meta sends { object: 'whatsapp_business_account', entry: [...] }
        if (($body['object'] ?? '') !== 'whatsapp_business_account') {
            Response::success(['success' => true]);
            return;
        }

        foreach ($body['entry'] ?? [] as $entry) {
            foreach ($entry['changes'] ?? [] as $change) {
                $value = $change['value'] ?? [];
                $contacts = $value['contacts'] ?? [];
                $messages = $value['messages'] ?? [];
                $statuses = $value['statuses'] ?? [];
                $metaPhoneId = $value['metadata']['phone_number_id'] ?? '';

                // Handle incoming messages
                foreach ($messages as $msg) {
                    $from = $msg['from'] ?? '';
                    $msgType = $msg['type'] ?? 'text';
                    $text = '';

                    if ($msgType === 'text') {
                        $text = $msg['text']['body'] ?? '';
                    } elseif ($msgType === 'interactive') {
                        $text = $msg['interactive']['button_reply']['title'] ?? $msg['interactive']['list_reply']['title'] ?? '';
                    } else {
                        $text = "[{$msgType}]";
                    }

                    $contactName = '';
                    foreach ($contacts as $c) {
                        if (($c['wa_id'] ?? '') === $from) {
                            $contactName = $c['profile']['name'] ?? '';
                            break;
                        }
                    }

                    // Find which professional owns this Meta phone
                    $stmt = $this->db->prepare("SELECT wi.professional_id, wi.instance_name FROM whatsapp_instances wi WHERE wi.meta_phone_id = ? LIMIT 1");
                    $stmt->execute([$metaPhoneId]);
                    $inst = $stmt->fetch();

                    if (!$inst) continue;

                    // Process as if it were an Evolution API message
                    $this->processIncoming($inst['professional_id'], $inst['instance_name'], $from, $contactName, $text, 'meta');
                }

                // Handle status updates (delivered, read, failed)
                foreach ($statuses as $status) {
                    $recipientId = $status['recipient_id'] ?? '';
                    $statusType = $status['status'] ?? ''; // sent, delivered, read, failed
                    $errors = $status['errors'] ?? [];

                    if ($statusType === 'failed' && !empty($errors)) {
                        error_log("Meta WhatsApp delivery failed to {$recipientId}: " . json_encode($errors));
                    }
                }
            }
        }

        Response::success(['success' => true]);
    }

    /**
     * Process incoming message (shared between Evolution and Meta)
     */
    private function processIncoming(string $professionalId, string $instanceName, string $phone, string $contactName, string $text, string $provider = 'evolution'): void
    {
        // This delegates to the main bot logic — find conversation, run AI, etc.
        // Re-use existing handle() flow by constructing an Evolution-compatible payload
        $syntheticPayload = [
            'event' => 'messages.upsert',
            'instance' => $instanceName,
            'data' => [
                'key' => ['fromMe' => false, 'remoteJid' => $phone . '@s.whatsapp.net'],
                'message' => ['conversation' => $text],
                'pushName' => $contactName,
            ],
            '_provider' => $provider,
        ];

        $this->handle($syntheticPayload);
    }
}
