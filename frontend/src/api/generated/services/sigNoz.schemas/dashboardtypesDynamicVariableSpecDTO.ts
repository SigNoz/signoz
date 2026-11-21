/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesDynamicVariableSignalDTO } from './dashboardtypesDynamicVariableSignalDTO';

export interface DashboardtypesDynamicVariableSpecDTO {
	/**
	 * @type string
	 * @description The attribute key whose observed values populate the variable, such as service.name.
	 */
	name: string;
	/**
	 * @description The signal the values are read from: traces, logs, metrics or all (default).
	 */
	signal: DashboardtypesDynamicVariableSignalDTO;
}
