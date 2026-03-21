<?php

namespace WebSocket;

/**
 * Notification Bridge
 * 
 * Used by the REST API to push realtime notifications
 * to the WebSocket server when data changes.
 * 
 * Usage from your API:
 *   NotificationBridge::notify('bookings', $professionalId, 'INSERT', $bookingData);
 */
class NotificationBridge
{
    private static string $wsHost = '127.0.0.1';
    private static int $wsPort = 8090;

    /**
     * Send a change notification to connected WebSocket clients.
     * Uses an internal TCP connection to the WS server.
     */
    public static function notify(string $table, string $professionalId, string $event, array $record): void
    {
        try {
            // We use a simple HTTP POST to an internal endpoint
            // that the WS server can process
            $payload = json_encode([
                'type'            => 'db_change',
                'table'           => $table,
                'professional_id' => $professionalId,
                'event'           => $event,
                'record'          => $record,
            ]);

            // Write to a shared notification file that the WS server watches
            $notifDir = sys_get_temp_dir() . '/gende_ws_notifications';
            if (!is_dir($notifDir)) {
                mkdir($notifDir, 0755, true);
            }

            $filename = $notifDir . '/' . uniqid('notif_', true) . '.json';
            file_put_contents($filename, $payload);

        } catch (\Exception $e) {
            error_log("WS Notification error: " . $e->getMessage());
        }
    }
}
