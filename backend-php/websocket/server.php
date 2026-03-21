<?php

/**
 * Gende WebSocket Server
 * 
 * Run: php server.php
 * Default port: 8090
 * 
 * Usage with systemd for production:
 * Create /etc/systemd/system/gende-ws.service
 */

require __DIR__ . '/vendor/autoload.php';

use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;
use WebSocket\RealtimeServer;

$port = (int) ($argv[1] ?? getenv('WS_PORT') ?: 8090);

echo "🚀 Gende WebSocket Server starting on port {$port}...\n";

$server = IoServer::factory(
    new HttpServer(
        new WsServer(
            new RealtimeServer()
        )
    ),
    $port
);

echo "✅ Server running on ws://0.0.0.0:{$port}\n";
$server->run();
