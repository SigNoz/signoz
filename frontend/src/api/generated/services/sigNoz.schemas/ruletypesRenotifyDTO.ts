/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { RuletypesAlertStateDTO } from './ruletypesAlertStateDTO';

export interface RuletypesRenotifyDTO {
	/**
	 * @type array,null
	 * @description The alert states that are re-notified: firing, nodata or both.
	 */
	alertStates?: RuletypesAlertStateDTO[] | null;
	/**
	 * @type boolean
	 * @description Whether an active alert is re-sent after interval elapses. When false an alert notifies once per firing.
	 */
	enabled?: boolean;
	/**
	 * @type string
	 * @description The time between repeat notifications, as a Go duration such as 4h. Must be positive when enabled is true.
	 */
	interval?: string;
}
