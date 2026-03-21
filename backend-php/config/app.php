<?php
/**
 * Application Configuration
 */

return [
    'jwt_secret'       => getenv('JWT_SECRET') ?: 'CHANGE_ME_TO_A_STRONG_SECRET_KEY',
    'jwt_expiry'       => 3600, // 1 hour
    'refresh_expiry'   => 604800, // 7 days
    'cors_origins'     => ['*'],
    'timezone'         => 'America/Sao_Paulo',

    // External APIs
    'stripe_secret_key'    => getenv('STRIPE_SECRET_KEY') ?: '',
    'evolution_api_url'    => getenv('EVOLUTION_API_URL') ?: '',
    'evolution_api_key'    => getenv('EVOLUTION_API_KEY') ?: '',
    'google_client_id'     => getenv('GOOGLE_CLIENT_ID') ?: '',
    'google_client_secret' => getenv('GOOGLE_CLIENT_SECRET') ?: '',
    'meta_app_id'          => getenv('META_APP_ID') ?: '',
    'meta_app_secret'      => getenv('META_APP_SECRET') ?: '',
];
