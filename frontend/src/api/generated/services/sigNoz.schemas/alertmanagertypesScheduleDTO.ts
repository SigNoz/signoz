/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AlertmanagertypesRecurrenceDTO } from './alertmanagertypesRecurrenceDTO';

export interface AlertmanagertypesScheduleDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	endTime?: string;
	recurrence?: AlertmanagertypesRecurrenceDTO;
	/**
	 * @type string
	 * @format date-time
	 */
	startTime: string;
	/**
	 * @type string
	 */
	timezone: string;
}
