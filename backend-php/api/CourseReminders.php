<?php
/**
 * Course Reminders (cron)
 * Replaces: supabase/functions/send-course-reminders/index.ts
 */

namespace Api;

use Core\Database;
use Core\Response;

class CourseReminders
{
    public function run(): void
    {
        $db = Database::getInstance();
        $whatsapp = new WhatsApp();
        $now = new \DateTime('now', new \DateTimeZone('America/Sao_Paulo'));
        $results = [];

        $stmt = $db->prepare("SELECT professional_id, instance_name, status FROM whatsapp_instances WHERE status = 'connected'");
        $stmt->execute();
        $instances = $stmt->fetchAll();

        foreach ($instances as $inst) {
            $profId = $inst['professional_id'];

            $stmt = $db->prepare("SELECT * FROM whatsapp_automations WHERE professional_id = ? AND is_enabled = 1 AND automation_type IN ('course_reminder_7d','course_reminder_1d','course_reminder_day','course_send_location','course_send_link','course_followup','course_feedback_request')");
            $stmt->execute([$profId]);
            $automations = [];
            foreach ($stmt->fetchAll() as $a) { $automations[$a['automation_type']] = $a; }
...
                    $finalMessage = WhatsApp::replaceVars($automation['custom_message'], [
                        'nome' => $enrollment['student_name'] ?? 'Aluno',
                        'curso' => $enrollment['course_name'] ?? '',
                        'turma' => $enrollment['class_name'] ?? '',
                        'data' => (new \DateTime($enrollment['class_date']))->format('d/m/Y'),
                        'horario' => substr($enrollment['start_time'] ?? '', 0, 5),
                        'local' => $enrollment['location'] ?? '',
                        'link_aula' => $enrollment['online_link'] ?? '',
                    ]);

                    $res = $whatsapp->sendMessage($inst['instance_name'], $enrollment['student_phone'], $finalMessage);

                    $db->prepare('INSERT INTO whatsapp_logs (id, professional_id, automation_id, booking_id, recipient_phone, message_content, status, sent_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')->execute([
                        Database::uuid(), $profId, $automation['id'], $enrollment['id'], $enrollment['student_phone'], $finalMessage, $res['ok'] ? 'sent' : 'failed', $res['ok'] ? date('c') : null,
                    ]);

                    $results[] = ['type' => $triggerType, 'id' => $enrollment['id'], 'success' => $res['ok']];
                }
            }
        }

        Response::success(['success' => true, 'processed' => count($results)]);
    }
}
