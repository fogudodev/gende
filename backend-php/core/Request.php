<?php

namespace Core;

class Request
{
    /**
     * Get JSON body as associative array
     */
    public static function json(): array
    {
        $body = file_get_contents('php://input');
        return json_decode($body, true) ?: [];
    }

    /**
     * Get query parameter
     */
    public static function query(string $key, $default = null)
    {
        return $_GET[$key] ?? $default;
    }

    /**
     * Get specific field from JSON body
     */
    public static function get(string $key, $default = null)
    {
        $data = self::json();
        return $data[$key] ?? $default;
    }
}
