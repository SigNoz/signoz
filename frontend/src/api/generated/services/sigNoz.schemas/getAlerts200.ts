/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AlertmanagertypesDeprecatedGettableAlertDTO } from './alertmanagertypesDeprecatedGettableAlertDTO';

export type GetAlerts200 = {
	/**
	 * @type array
	 */
	data: AlertmanagertypesDeprecatedGettableAlertDTO[];
	/**
	 * @type string
	 */
	status: string;
};
