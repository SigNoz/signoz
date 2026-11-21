/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AlertmanagertypesMaintenanceKindDTO } from './alertmanagertypesMaintenanceKindDTO';
import type { AlertmanagertypesMaintenanceStatusDTO } from './alertmanagertypesMaintenanceStatusDTO';
import type { AlertmanagertypesScheduleDTO } from './alertmanagertypesScheduleDTO';

export interface AlertmanagertypesPlannedMaintenanceDTO {
	/**
	 * @type array,null
	 */
	alertIds?: string[] | null;
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: string;
	/**
	 * @type string
	 */
	createdBy?: string;
	/**
	 * @type string
	 */
	description?: string;
	/**
	 * @type string
	 */
	id: string;
	kind: AlertmanagertypesMaintenanceKindDTO;
	/**
	 * @type string
	 */
	name: string;
	schedule: AlertmanagertypesScheduleDTO;
	/**
	 * @type string
	 */
	scope?: string;
	status: AlertmanagertypesMaintenanceStatusDTO;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt?: string;
	/**
	 * @type string
	 */
	updatedBy?: string;
}
