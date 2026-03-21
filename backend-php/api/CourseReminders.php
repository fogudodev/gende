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

            $stmt = $db->prepare("SELECT * FROM whatsapp_automations WHERE professional_id = ? AND is_active = 1 AND trigger_type IN ('course_reminder_7d','course_reminder_1d','course_reminder_day','course_send_location','course_send_link','course_followup','course_feedback_request')");
            $stmt->execute([$profId]);
            $automations = [];
            foreach ($stmt->fetchAll() as $a) { $automations[$a['trigger_type']] = $a; }
            if (empty($automations)) continue;

            $stmt = $db->prepare("SELECT e.*, c.name as course_name, c.slug as course_slug, cc.name as class_name, cc.class_date, cc.start_time, cc.end_time, cc.location, cc.online_link, cc.modality, cc.status as class_status FROM course_enrollments e LEFT JOIN courses c ON c.id = e.course_id LEFT JOIN course_classes cc ON cc.id = e.class_id WHERE e.professional_id = ? AND e.enrollment_status = 'confirmed'");
            $stmt->execute([$profId]);
            $enrollments = $stmt->fetchAll();

            foreach ($enrollments as $enrollment) {
                if (!$enrollment['student_phone'] || $enrollment['class_status'] === 'cancelled') continue;

                $classDate = new \DateTime($enrollment['class_date'] . ' ' . $enrollment['start_time'], new \DateTimeZone('America/Sao_Paulo'));
                $diffDays = ($classDate->getTimestamp() - $now->getTimestamp()) / 86400;

                $triggers = [];
                if ($diffDays >= 6.5 && $diffDays <= 7.5 && isset($automations['course_reminder_7d'])) $triggers[] = 'course_reminder_7d';
                if ($diffDays >= 0.5 && $diffDays <= 1.5 && isset($automations['course_reminder_1d'])) $triggers[] = 'course_reminder_1d';
                if ($diffDays >= -0.5 && $diffDays <= 0.5 && $diffDays > 0 && isset($automations['course_reminder_day'])) $triggers[] = 'course_reminder_day';
                if ($diffDays >= -1.5 && $diffDays <= -0.5 && isset($automations['course_followup'])) $triggers[] = 'course_followup';

                foreach ($triggers as $triggerType) {
                    $automation = $automations[$triggerType];
                    $stmt = $db->prepare('SELECT id FROM whatsapp_logs WHERE professional_id = ? AND automation_id = ? AND recipient_phone = ? AND booking_id = ? LIMIT 1');
                    $stmt->execute([$profId, $automation['id'], $enrollment['student_phone'], $enrollment['id']]);
                    if ($stmt->fetch()) continue;

                    $finalMessage = WhatsApp::replaceVars($automation['message_template'], [
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
