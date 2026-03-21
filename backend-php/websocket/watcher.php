<?php

/**
 * Notification Watcher
 * 
 * Runs alongside the WebSocket server to pick up
 * database change notifications from the REST API
 * and broadcast them to connected clients.
 * 
 * Run: php watcher.php
 */

require __DIR__ . '/vendor/autoload.php';

$notifDir = sys_get_temp_dir() . '/gende_ws_notifications';
if (!is_dir($notifDir)) {
    mkdir($notifDir, 0755, true);
}

echo "👀 Notification watcher started. Watching: {$notifDir}\n";

// Connect to the WS server as an internal client
$wsUrl = 'ws://127.0.0.1:' . (getenv('WS_PORT') ?: '8090');

while (true) {
    $files = glob($notifDir . '/notif_*.json');
    
    foreach ($files as $file) {
        $content = @file_get_contents($file);
        @unlink($file);
        
        if (!$content) continue;
        
        $data = json_decode($content, true);
        if (!$data) continue;
        
        echo "📨 Processing: {$data['table']} → {$data['event']} (prof: {$data['professional_id']})\n";
        
        // The WS server handles this internally
        // For now, we use file-based IPC
        // In production, you could use Redis pub/sub instead
        
        $broadcastFile = $notifDir . '/broadcast_' . uniqid() . '.json';
        file_put_contents($broadcastFile, $content);
    }
    
    // Check every 500ms
    usleep(500000);
}
