<?php

/**
 * Notification Helper
 * 
 * Include this in your REST API to trigger WebSocket 
 * notifications when data changes.
 * 
 * Usage:
 *   require_once __DIR__ . '/notify.php';
 *   ws_notify('bookings', $professionalId, 'INSERT', $record);
 */

function ws_notify(string $table, string $professionalId, string $event, array $record): void
{
    $payload = json_encode([
        'type'            => 'db_change',
        'table'           => $table,
        'professional_id' => $professionalId,
        'event'           => $event,
        'record'          => $record,
    ]);

    $notifDir = sys_get_temp_dir() . '/gende_ws_notifications';
    if (!is_dir($notifDir)) {
        @mkdir($notifDir, 0755, true);
    }

    $filename = $notifDir . '/' . uniqid('notif_', true) . '.json';
    @file_put_contents($filename, $payload);
}
