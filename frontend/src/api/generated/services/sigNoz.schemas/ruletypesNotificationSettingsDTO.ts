/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { RuletypesRenotifyDTO } from './ruletypesRenotifyDTO';

export interface RuletypesNotificationSettingsDTO {
	/**
	 * @type array,null
	 * @description Label names whose values group alerts into one notification, such as service.name.
	 */
	groupBy?: string[] | null;
	/**
	 * @type string
	 * @description A grace period, as a Go duration such as 2m, during which a newly seen label group is excluded from evaluation. Applies to metric rules only; log and trace rules are never delayed. A group whose values are not yet known is evaluated immediately.
	 */
	newGroupEvalDelay?: string;
	/**
	 * @description Whether and how often to re-send a notification for an alert that stays active.
	 */
	renotify?: RuletypesRenotifyDTO;
	/**
	 * @type boolean
	 * @description When true, alerts are routed by the organisation level notification policies instead of the channels named on the thresholds. Defaults to false.
	 */
	usePolicy?: boolean;
}
