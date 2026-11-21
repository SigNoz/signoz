/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesDisplayDTO } from './dashboardtypesDisplayDTO';

export interface DashboardtypesTextVariableSpecDTO {
	/**
	 * @type boolean
	 * @description Whether the value is meant to be fixed. Stored, but not applied by the UI.
	 */
	constant?: boolean;
	/**
	 * @description The label shown for the variable control.
	 */
	display: DashboardtypesDisplayDTO;
	/**
	 * @type string
	 * @minLength 1
	 * @description The handle queries reference as $name. Up to 75 characters from letters, digits, dot, underscore and hyphen, not all digits, unique within the dashboard.
	 */
	name: string;
	/**
	 * @type string
	 * @description The default text. Must be non-empty when constant is true.
	 */
	value: string;
}
