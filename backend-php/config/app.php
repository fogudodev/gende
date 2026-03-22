<?php
/**
 * Application Configuration
 */

return [
    'jwt_secret'       => getenv('JWT_SECRET') ?: 'CHANGE_ME_TO_A_STRONG_SECRET_KEY',
    'jwt_expiry'       => 3600,
    'refresh_expiry'   => 604800,
    'cors_origins'     => ['*'],
    'timezone'         => 'America/Sao_Paulo',
    'app_url'          => getenv('APP_URL') ?: 'https://api.gende.io',

    // External APIs
    'stripe_secret_key'         => getenv('STRIPE_SECRET_KEY') ?: '',
    'evolution_api_url'         => getenv('EVOLUTION_API_URL') ?: '',
    'evolution_api_key'         => getenv('EVOLUTION_API_KEY') ?: '',
    'google_client_id'          => getenv('GOOGLE_CLIENT_ID') ?: '',
    'google_client_secret'      => getenv('GOOGLE_CLIENT_SECRET') ?: '',
    'meta_app_id'               => getenv('META_APP_ID') ?: '',
    'meta_app_secret'           => getenv('META_APP_SECRET') ?: '',
    'meta_webhook_verify_token' => getenv('META_WEBHOOK_VERIFY_TOKEN') ?: '',
    'meta_whatsapp_token'       => getenv('META_WHATSAPP_TOKEN') ?: '',
    'meta_whatsapp_phone_id'    => getenv('META_WHATSAPP_PHONE_ID') ?: '',
    'meta_api_version'          => getenv('META_API_VERSION') ?: 'v21.0',
    'gemini_api_key'            => getenv('GEMINI_API_KEY') ?: '',
];
