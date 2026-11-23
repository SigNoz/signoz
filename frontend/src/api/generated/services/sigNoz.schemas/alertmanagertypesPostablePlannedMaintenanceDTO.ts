/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AlertmanagertypesScheduleDTO } from './alertmanagertypesScheduleDTO';

export interface AlertmanagertypesPostablePlannedMaintenanceDTO {
	/**
	 * @type array,null
	 */
	alertIds?: string[] | null;
	/**
	 * @type string
	 */
	description?: string;
	/**
	 * @type string
	 */
	name: string;
	schedule: AlertmanagertypesScheduleDTO;
	/**
	 * @type string
	 */
	scope?: string;
}
