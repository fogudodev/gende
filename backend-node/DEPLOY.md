# 🚀 Guia de Deploy - Gende (Node.js + React)

## Estrutura

```
backend-node/     → API Node.js/Express (VPS Hostinger)
src/              → Frontend React/Vite (build estático)
```

---

## 1️⃣ Preparar o VPS Hostinger

### Conectar via SSH
```bash
ssh root@seu-ip-do-vps
```

### Instalar Node.js 20+
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs nginx mysql-server certbot python3-certbot-nginx
npm install -g pm2
```

### Configurar MySQL
```bash
mysql -u root -p
```
```sql
CREATE DATABASE gende CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'gende_user'@'localhost' IDENTIFIED BY 'SUA_SENHA_FORTE';
GRANT ALL ON gende.* TO 'gende_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Importar schema
```bash
mysql -u gende_user -p gende < /var/www/gende-api/sql/schema.sql
```

---

## 2️⃣ Deploy do Backend (API)

### Upload dos arquivos
```bash
mkdir -p /var/www/gende-api
# Suba a pasta backend-node/ para /var/www/gende-api/
scp -r backend-node/* root@seu-ip:/var/www/gende-api/
```

### Instalar dependências
```bash
cd /var/www/gende-api
npm install
```

### Configurar .env
```bash
cp .env.example .env
nano .env
# Preencha TODOS os valores
```

### Iniciar com PM2
```bash
pm2 start npm --name "gende-api" -- start
pm2 save
pm2 startup
```

### Verificar
```bash
curl http://localhost:3001/health
# Deve retornar: {"status":"ok","version":"1.0.0",...}
```

---

## 3️⃣ Deploy do Frontend (React)

### Build local
```bash
# No seu computador, na raiz do projeto:
npm run build
```

### Upload para o VPS
```bash
mkdir -p /var/www/gende-app
scp -r dist/* root@seu-ip:/var/www/gende-app/
```

---

## 4️⃣ Configurar Nginx

```bash
nano /etc/nginx/sites-available/gende
```

```nginx
# API Backend
server {
    listen 80;
    server_name api.gende.io;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400s;
    }
}

# Frontend App
server {
    listen 80;
    server_name app.gende.io;

    root /var/www/gende-app;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
ln -s /etc/nginx/sites-available/gende /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### SSL (HTTPS)
```bash
certbot --nginx -d api.gende.io -d app.gende.io
```

---

## 5️⃣ Cron Jobs

```bash
crontab -e
```

```cron
*/5 * * * * curl -s -X POST http://localhost:3001/cron/send-reminders > /dev/null
*/10 * * * * curl -s -X POST http://localhost:3001/cron/send-campaigns > /dev/null
* * * * * curl -s -X POST http://localhost:3001/cron/conversation-timeout > /dev/null
0 */6 * * * curl -s -X POST http://localhost:3001/cron/course-reminders > /dev/null
*/15 * * * * curl -s -X POST http://localhost:3001/cron/waitlist-process > /dev/null
```

---

## 6️⃣ Frontend - Variáveis de Ambiente

No arquivo `.env` do frontend (antes do build):
```
VITE_PHP_API_URL=https://api.gende.io
VITE_BACKEND_MODE=php
```

> **Nota:** O `php-client.ts` funciona com qualquer backend REST (Node.js ou PHP). O nome `php` no modo é apenas por compatibilidade — a interface é a mesma.

---

## 7️⃣ Comandos Úteis

```bash
# Ver logs
pm2 logs gende-api

# Reiniciar
pm2 restart gende-api

# Atualizar código
cd /var/www/gende-api && git pull && npm install && pm2 restart gende-api

# Status
pm2 status

# Monitoramento
pm2 monit
```

---

## 8️⃣ Checklist Final

- [ ] MySQL criado e schema importado
- [ ] `.env` preenchido com todas as chaves
- [ ] `curl localhost:3001/health` retorna OK
- [ ] Nginx configurado e SSL ativo
- [ ] Cron jobs configurados
- [ ] Frontend buildado e servido
- [ ] Webhook da Meta apontando para `https://api.gende.io/whatsapp/meta-webhook`
- [ ] Stripe webhook apontando para `https://api.gende.io/stripe/webhook`
