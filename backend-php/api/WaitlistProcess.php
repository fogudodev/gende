<?php
/**
 * Waitlist Processing
 * Replaces: supabase/functions/waitlist-process/index.ts
 */

namespace Api;

use Core\Database;
use Core\Response;

class WaitlistProcess
{
    private \PDO $db;
    private WhatsApp $whatsapp;

    public function __construct()
    {
        $this->db = Database::getInstance();
        $this->whatsapp = new WhatsApp();
    }

    public function handle(array $data): void
    {
        $action = $data['action'] ?? '';
        match ($action) {
            'process-cancellation' => $this->processCancellation($data),
            'accept-offer' => $this->acceptOffer($data),
            default => Response::error('Unknown action', 400),
        };
    }

    private function processCancellation(array $data): void
    {
        $profId = $data['professionalId'];
        $serviceId = $data['serviceId'];
        $startTime = $data['startTime'];
        $endTime = $data['endTime'];

        $stmt = $this->db->prepare('SELECT * FROM waitlist_settings WHERE professional_id = ?');
        $stmt->execute([$profId]);
        $settings = $stmt->fetch();
        if ($settings && !$settings['enabled']) { Response::success(['success' => false, 'reason' => 'waitlist_disabled']); return; }

        $maxNotifications = $settings['max_notifications'] ?? 3;
        $reservationMinutes = $settings['reservation_minutes'] ?? 3;

        $slotDate = new \DateTime($startTime);
        $dateStr = $slotDate->format('Y-m-d');
        $hour = (int)$slotDate->format('G');
        $period = $hour < 12 ? 'morning' : ($hour < 18 ? 'afternoon' : 'evening');

        $stmt = $this->db->prepare("SELECT * FROM waitlist WHERE professional_id = ? AND status = 'waiting' AND (service_id = ? OR service_id IS NULL) ORDER BY priority DESC, created_at ASC");
        $stmt->execute([$profId, $serviceId]);
        $entries = $stmt->fetchAll();

        $compatible = array_filter($entries, fn($e) => $e['preferred_date'] === $dateStr && ($e['preferred_period'] === 'any' || $e['preferred_period'] === $period));

        if (empty($compatible)) $compatible = $entries;

        $toNotify = array_slice(array_values($compatible), 0, $maxNotifications);
        if (empty($toNotify)) { Response::success(['success' => false, 'reason' => 'no_candidates']); return; }

        $candidates = array_map(fn($e) => ['name' => $e['client_name'], 'phone' => $e['client_phone'], 'waitlistEntryId' => $e['id']], $toNotify);
        $sent = $this->sendOffers($profId, $serviceId, $startTime, $endTime, $candidates, $reservationMinutes);

        foreach ($toNotify as $entry) {
            $this->db->prepare("UPDATE waitlist SET status = 'notified', notified_at = NOW() WHERE id = ?")->execute([$entry['id']]);
        }

        Response::success(['success' => true, 'offers_sent' => $sent]);
    }

    private function acceptOffer(array $data): void
    {
        $offerId = $data['offerId'];

        $stmt = $this->db->prepare('SELECT * FROM waitlist_offers WHERE id = ?');
        $stmt->execute([$offerId]);
        $offer = $stmt->fetch();
        if (!$offer) { Response::success(['success' => false, 'error' => 'Oferta não encontrada']); return; }
        if ($offer['status'] !== 'sent') { Response::success(['success' => false, 'error' => 'Oferta já respondida']); return; }
        if ($offer['reserved_until'] && strtotime($offer['reserved_until']) < time()) {
            $this->db->prepare("UPDATE waitlist_offers SET status = 'expired' WHERE id = ?")->execute([$offerId]);
            Response::success(['success' => false, 'error' => 'Tempo expirado']);
            return;
        }

        // Create booking
        $stmt = $this->db->prepare('SELECT price, duration_minutes FROM services WHERE id = ?');
        $stmt->execute([$offer['service_id']]);
        $service = $stmt->fetch();

        $bookingId = Database::uuid();
        $stmt = $this->db->prepare('INSERT INTO bookings (id, professional_id, service_id, client_name, client_phone, start_time, end_time, price, duration_minutes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([$bookingId, $offer['professional_id'], $offer['service_id'], $offer['client_name'], $offer['client_phone'], $offer['slot_start'], $offer['slot_end'], $service['price'] ?? 0, $service['duration_minutes'] ?? 30, 'confirmed']);

        $this->db->prepare("UPDATE waitlist_offers SET status = 'accepted', responded_at = NOW(), created_booking_id = ? WHERE id = ?")->execute([$bookingId, $offerId]);
        $this->db->prepare("UPDATE waitlist_offers SET status = 'slot_taken' WHERE professional_id = ? AND slot_start = ? AND id != ? AND status = 'sent'")->execute([$offer['professional_id'], $offer['slot_start'], $offerId]);

        if ($offer['waitlist_entry_id']) {
            $this->db->prepare("UPDATE waitlist SET status = 'booked' WHERE id = ?")->execute([$offer['waitlist_entry_id']]);
        }

        Response::success(['success' => true, 'booking_id' => $bookingId]);
    }

    private function sendOffers(string $profId, string $serviceId, string $startTime, string $endTime, array $candidates, int $reservationMinutes): int
    {
        $stmt = $this->db->prepare("SELECT instance_name, status FROM whatsapp_instances WHERE professional_id = ? LIMIT 1");
        $stmt->execute([$profId]);
        $inst = $stmt->fetch();
        if (!$inst || $inst['status'] !== 'connected') return 0;

        $stmt = $this->db->prepare('SELECT name, business_name, slug FROM professionals WHERE id = ?');
        $stmt->execute([$profId]);
        $prof = $stmt->fetch();

        $stmt = $this->db->prepare('SELECT name, price FROM services WHERE id = ?');
        $stmt->execute([$serviceId]);
        $service = $stmt->fetch();

        $slotDate = new \DateTime($startTime);
        $businessName = $prof['business_name'] ?: ($prof['name'] ?? 'Salão');
        $bookingLink = $prof['slug'] ? "https://gende.io/{$prof['slug']}" : '';
        $sent = 0;

        foreach ($candidates as $c) {
            $reservedUntil = date('Y-m-d H:i:s', time() + $reservationMinutes * 60);

            $this->db->prepare('INSERT INTO waitlist_offers (id, professional_id, waitlist_entry_id, client_name, client_phone, service_id, slot_start, slot_end, status, reserved_until) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')->execute([
                Database::uuid(), $profId, $c['waitlistEntryId'], $c['name'], $c['phone'], $serviceId, $startTime, $endTime, 'sent', $reservedUntil,
            ]);

            $message = "✨ *Horário disponível!*\n\nOlá {$c['name']}!\n\n📅 *" . $slotDate->format('d/m') . "* às *" . $slotDate->format('H:i') . "*\n💇 *" . ($service['name'] ?? 'Serviço') . "*\n📍 {$businessName}\n\n" . ($bookingLink ? "📲 Agende: {$bookingLink}\n\n" : '') . "⏰ Responda rápido!";

            $res = $this->whatsapp->sendMessage($inst['instance_name'], $c['phone'], $message);
            if ($res['ok']) $sent++;
        }

        return $sent;
    }
}
