/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { RuletypesAlertStateDTO } from './ruletypesAlertStateDTO';
import type { RuletypesAlertTypeDTO } from './ruletypesAlertTypeDTO';
import type { RuletypesListableRuleDTOLabels } from './ruletypesListableRuleDTOLabels';
import type { RuletypesRuleTypeDTO } from './ruletypesRuleTypeDTO';

export interface RuletypesListableRuleDTO {
	/**
	 * @type string
	 * @description The display name of the alert rule.
	 */
	alert: string;
	/**
	 * @description The signal the rule evaluates: METRIC_BASED_ALERT, TRACES_BASED_ALERT, LOGS_BASED_ALERT, EXCEPTIONS_BASED_ALERT or AI_TRACES_BASED_ALERT.
	 */
	alertType: RuletypesAlertTypeDTO;
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
	 * @description A human readable description of what the rule monitors.
	 */
	description?: string;
	/**
	 * @type boolean
	 * @description Whether the rule is paused.
	 */
	disabled?: boolean;
	/**
	 * @type string
	 * @description The unique identifier of the rule.
	 */
	id: string;
	/**
	 * @type object
	 * @description The labels attached to alerts the rule fires.
	 */
	labels?: RuletypesListableRuleDTOLabels;
	/**
	 * @description The evaluation strategy: threshold_rule, promql_rule or anomaly_rule.
	 */
	ruleType: RuletypesRuleTypeDTO;
	/**
	 * @description The current evaluation state: inactive, pending, recovering, firing, nodata or disabled.
	 */
	state: RuletypesAlertStateDTO;
	/**
	 * @type array
	 * @description The rule's threshold names in lowercase, deduplicated and ordered critical, error, warning, info, then other names. An alert carries the name of the threshold that fired as its severity. Read-only.
	 */
	thresholds: string[];
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
