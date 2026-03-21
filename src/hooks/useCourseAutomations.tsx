import { api } from "@/lib/api-client";

/**
 * Trigger a course-specific WhatsApp automation.
 * 
 * For event-driven automations like:
 * - course_enrollment_confirmed
 * - course_payment_confirmed
 * - course_rescheduled
 * - course_cancelled
 * - course_waitlist_new_class
 * - course_certificate_sent
 * - course_next_offer
 */
export const triggerCourseAutomation = async (params: {
  professionalId: string;
  triggerType: string;
  enrollmentId?: string;
  classId?: string;
  extraVars?: Record<string, string>;
  recipients?: Array<{ name: string; phone: string }>;
}) => {
  try {
    const { data, error } = await supabase.functions.invoke("send-course-reminders", {
      body: {
        action: "trigger",
        ...params,
      },
    });
    if (error) {
      console.error("Course automation error:", error);
      return { success: false };
    }
    return data;
  } catch (err) {
    console.error("Course automation error:", err);
    return { success: false };
  }
};
