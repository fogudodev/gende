<?php

namespace Core;

class Response
{
    public static function json($data, int $status = 200): void
    {
        http_response_code($status);
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
    }

    public static function error(string $message, int $status = 400): void
    {
        self::json(['error' => $message], $status);
    }

    public static function success($data = null, int $status = 200): void
    {
        self::json($data ?? ['success' => true], $status);
    }
}
