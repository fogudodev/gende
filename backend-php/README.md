# GENDE Backend - PHP/MySQL

Backend completo para hospedagem na Hostinger, espelhando todas as funcionalidades do Lovable Cloud/Supabase.

## Estrutura

```
backend-php/
├── .htaccess              # Rewrite rules para Apache
├── index.php              # Entry point + rotas da API
├── config/
│   ├── .env.example       # Template de variáveis de ambiente
│   ├── app.php            # Configurações da aplicação
│   └── database.php       # Configuração MySQL
├── core/
│   ├── Auth.php           # JWT authentication
│   ├── CrudController.php # CRUD genérico multi-tenant
│   ├── Database.php       # PDO singleton
│   ├── Request.php        # Request helper
│   ├── Response.php       # Response helper
│   └── Router.php         # Simple router
└── sql/
    └── schema.sql         # Schema MySQL completo
```

## Setup na Hostinger

### 1. Banco de Dados
1. No painel Hostinger, crie um banco MySQL
2. Importe o arquivo `sql/schema.sql` via phpMyAdmin
3. Anote host, nome do banco, usuário e senha

### 2. Configuração
1. Copie `config/.env.example` para `config/.env`
2. Preencha com seus dados:
   - Credenciais MySQL
   - JWT_SECRET (gere um hash forte)
   - Chaves de API (Stripe, Evolution, etc.)

### 3. Deploy
1. Faça upload da pasta `backend-php/` para `public_html/api/` (ou o diretório desejado)
2. Certifique-se que o `.htaccess` está funcionando (mod_rewrite habilitado)

### 4. Frontend
Atualize as chamadas da API no frontend para apontar para:
```
https://seudominio.com/api
```

## Endpoints da API

### Autenticação
- `POST /api/auth/signup` - Cadastro
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout

### Perfil
- `GET /api/profile` - Dados do profissional
- `PUT /api/profile` - Atualizar perfil

### CRUD (todos seguem o mesmo padrão)
- `GET /api/{recurso}` - Listar
- `GET /api/{recurso}/{id}` - Detalhe
- `POST /api/{recurso}` - Criar
- `PUT /api/{recurso}/{id}` - Atualizar
- `DELETE /api/{recurso}/{id}` - Deletar

Recursos: services, clients, bookings, products, coupons, payments, reviews, expenses, commissions, campaigns, salon-employees, courses, etc.

### Rotas Públicas
- `GET /api/public/professional/{slug}`
- `GET /api/public/services/{professionalId}`
- `GET /api/public/working-hours/{professionalId}`
- `GET /api/public/reviews/{professionalId}`
- `POST /api/public/booking`

### Admin
- `GET /api/admin/professionals`
- `PUT /api/admin/professionals/{id}/block`
- `GET /api/admin/users`

### Dashboard
- `GET /api/dashboard/stats`

### WhatsApp
- `POST /api/whatsapp/send` (com fallback Evolution → Meta Cloud)

## Segurança
- Autenticação via JWT (Bearer token)
- Senhas com bcrypt
- Multi-tenant: cada profissional só acessa seus próprios dados
- Proteção contra SQL injection via prepared statements
- Headers de segurança no .htaccess

## Requisitos
- PHP 8.1+
- MySQL 8.0+
- mod_rewrite habilitado
- Extensões: pdo_mysql, json, openssl
