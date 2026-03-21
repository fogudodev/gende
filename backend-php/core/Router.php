<?php

namespace Core;

class Router
{
    private array $routes = [];

    public function get(string $path, callable $handler): void
    {
        $this->routes['GET'][$path] = $handler;
    }

    public function post(string $path, callable $handler): void
    {
        $this->routes['POST'][$path] = $handler;
    }

    public function put(string $path, callable $handler): void
    {
        $this->routes['PUT'][$path] = $handler;
    }

    public function delete(string $path, callable $handler): void
    {
        $this->routes['DELETE'][$path] = $handler;
    }

    public function dispatch(): void
    {
        $method = $_SERVER['REQUEST_METHOD'];
        $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

        // Remove /api prefix if present
        $uri = preg_replace('#^/api#', '', $uri);
        $uri = $uri ?: '/';

        // Handle CORS preflight
        if ($method === 'OPTIONS') {
            http_response_code(204);
            return;
        }

        // Try exact match first
        if (isset($this->routes[$method][$uri])) {
            $this->routes[$method][$uri]();
            return;
        }

        // Try pattern matching with params
        foreach ($this->routes[$method] ?? [] as $pattern => $handler) {
            $regex = preg_replace('#\{(\w+)\}#', '(?P<$1>[^/]+)', $pattern);
            if (preg_match("#^{$regex}$#", $uri, $matches)) {
                // Filter only named matches
                $params = array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);
                $handler($params);
                return;
            }
        }

        http_response_code(404);
        echo json_encode(['error' => 'Route not found']);
    }
}
