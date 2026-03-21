# WebSocket Server - Gende Realtime

Servidor WebSocket usando PHP Ratchet para notificações em tempo real.

## Instalação no VPS

### 1. Instalar dependências
```bash
cd /var/www/backend-php/websocket
composer install
```

### 2. Configurar como serviço do sistema
```bash
# Copiar o arquivo de serviço
sudo cp gende-ws.service /etc/systemd/system/

# Ajustar caminhos se necessário
sudo nano /etc/systemd/system/gende-ws.service

# Ativar e iniciar
sudo systemctl daemon-reload
sudo systemctl enable gende-ws
sudo systemctl start gende-ws

# Verificar status
sudo systemctl status gende-ws

# Ver logs
sudo journalctl -u gende-ws -f
```

### 3. Configurar Nginx como proxy (WSS)
Adicione ao seu bloco server do Nginx:

```nginx
location /ws {
    proxy_pass http://127.0.0.1:8090;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 86400;
}
```

Agora o WebSocket fica acessível em `wss://seudominio.com/ws`

### 4. Firewall
```bash
# Não precisa abrir a porta 8090 externamente!
# O Nginx faz proxy, então só precisa de 80/443
```

## Arquitetura

```
Cliente (React)
    ↕ wss://seudominio.com/ws (via Nginx)
    ↕
Ratchet WebSocket Server (:8090)
    ↕
REST API (index.php)
    ↕ NotificationBridge (file IPC)
    ↕
MySQL
```

## Protocolo de mensagens

### Autenticação
```json
→ { "type": "auth", "token": "jwt_token_here" }
← { "type": "auth_success", "user_id": "...", "professional_id": "..." }
```

### Subscribe a uma tabela
```json
→ { "type": "subscribe", "channel": "bookings" }
← { "type": "subscribed", "channel": "bookings" }
```

### Receber mudanças
```json
← {
    "type": "postgres_changes",
    "channel": "bookings",
    "event": "INSERT",
    "payload": {
        "table": "bookings",
        "type": "INSERT",
        "record": { ... }
    }
}
```

### Ping/Pong (keepalive)
```json
→ { "type": "ping" }
← { "type": "pong" }
```
