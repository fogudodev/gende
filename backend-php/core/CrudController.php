<?php

namespace Core;

/**
 * Generic CRUD controller that provides standard operations
 * for any table scoped by professional_id (multi-tenant)
 */
class CrudController
{
    protected string $table;
    protected string $professionalColumn = 'professional_id';

    public function __construct(string $table)
    {
        $this->table = $table;
    }

    /**
     * List all records for the current professional
     */
    public function list(): void
    {
        $user = Auth::requireAuth();
        $profId = Auth::getProfessionalId($user['sub']);
        if (!$profId) {
            Response::error('Professional not found', 404);
            return;
        }

        $db = Database::getInstance();
        $stmt = $db->prepare("SELECT * FROM `{$this->table}` WHERE `{$this->professionalColumn}` = ? ORDER BY created_at DESC");
        $stmt->execute([$profId]);
        Response::success($stmt->fetchAll());
    }

    /**
     * Get a single record by ID
     */
    public function get(string $id): void
    {
        $user = Auth::requireAuth();
        $profId = Auth::getProfessionalId($user['sub']);

        $db = Database::getInstance();
        $stmt = $db->prepare("SELECT * FROM `{$this->table}` WHERE id = ? AND `{$this->professionalColumn}` = ?");
        $stmt->execute([$id, $profId]);
        $row = $stmt->fetch();

        if (!$row) {
            Response::error('Not found', 404);
            return;
        }
        Response::success($row);
    }

    /**
     * Create a new record
     */
    public function create(array $data): void
    {
        $user = Auth::requireAuth();
        $profId = Auth::getProfessionalId($user['sub']);
        if (!$profId) {
            Response::error('Professional not found', 404);
            return;
        }

        $data[$this->professionalColumn] = $profId;
        $data['id'] = $data['id'] ?? Database::uuid();

        $db = Database::getInstance();
        $columns = implode(', ', array_map(fn($k) => "`$k`", array_keys($data)));
        $placeholders = implode(', ', array_fill(0, count($data), '?'));

        $stmt = $db->prepare("INSERT INTO `{$this->table}` ($columns) VALUES ($placeholders)");
        $stmt->execute(array_values($data));

        Response::success(['id' => $data['id']], 201);
    }

    /**
     * Update a record
     */
    public function update(string $id, array $data): void
    {
        $user = Auth::requireAuth();
        $profId = Auth::getProfessionalId($user['sub']);

        // Remove fields that shouldn't be updated
        unset($data['id'], $data[$this->professionalColumn], $data['created_at']);

        if (empty($data)) {
            Response::error('No data to update');
            return;
        }

        $db = Database::getInstance();
        $sets = implode(', ', array_map(fn($k) => "`$k` = ?", array_keys($data)));
        $values = array_values($data);
        $values[] = $id;
        $values[] = $profId;

        $stmt = $db->prepare("UPDATE `{$this->table}` SET $sets WHERE id = ? AND `{$this->professionalColumn}` = ?");
        $stmt->execute($values);

        Response::success(['updated' => $stmt->rowCount() > 0]);
    }

    /**
     * Delete a record
     */
    public function delete(string $id): void
    {
        $user = Auth::requireAuth();
        $profId = Auth::getProfessionalId($user['sub']);

        $db = Database::getInstance();
        $stmt = $db->prepare("DELETE FROM `{$this->table}` WHERE id = ? AND `{$this->professionalColumn}` = ?");
        $stmt->execute([$id, $profId]);

        Response::success(['deleted' => $stmt->rowCount() > 0]);
    }
}
