import { db } from '../core/database.js';

export interface EligibilityInputs {
  clientId: string;
  professionalId: string;
  lastCompletedAppointmentAt: Date | null;
  avgReturnIntervalDays: number | null;
}

export class ReactivationEligibilityService {
  /**
   * Checks if a client is eligible for reactivation.
   * Criteria:
   * 1. Has at least 1 completed appointment
   * 2. Has no upcoming appointments
   * 3. Current date > last_completed_appointment_at + expected_return_window
   */
  public static async isEligible(inputs: EligibilityInputs): Promise<boolean> {
    const { clientId, professionalId, lastCompletedAppointmentAt, avgReturnIntervalDays } = inputs;

    // Must have a past appointment
    if (!lastCompletedAppointmentAt) {
      return false;
    }

    // Check if they have an upcoming appointment (status pending or confirmed)
    const upcomingResult = await db.queryOne<{ has_upcoming: number }>(`
      SELECT 1 as has_upcoming 
      FROM \`bookings\` 
      WHERE \`client_id\` = ? 
        AND \`professional_id\` = ? 
        AND \`start_time\` > NOW() 
        AND \`status\` IN ('pending', 'confirmed')
      LIMIT 1
    `, [clientId, professionalId]);

    if (upcomingResult?.has_upcoming) {
      return false;
    }

    // Expected return window
    const expectedReturnWindow = avgReturnIntervalDays && avgReturnIntervalDays > 0 
      ? avgReturnIntervalDays 
      : 30; // Global fallback 30 days

    const lastVisitDate = new Date(lastCompletedAppointmentAt);
    const expectedReturnDate = new Date(lastVisitDate.getTime() + expectedReturnWindow * 24 * 60 * 60 * 1000);
    
    // Eligible if the current date is strictly past their expected return date
    return new Date() > expectedReturnDate;
  }
}
