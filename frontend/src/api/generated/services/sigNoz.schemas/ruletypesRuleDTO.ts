/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { RuletypesAlertStateDTO } from './ruletypesAlertStateDTO';
import type { RuletypesAlertTypeDTO } from './ruletypesAlertTypeDTO';
import type { RuletypesEvaluationEnvelopeDTO } from './ruletypesEvaluationEnvelopeDTO';
import type { RuletypesNotificationSettingsDTO } from './ruletypesNotificationSettingsDTO';
import type { RuletypesRuleConditionDTO } from './ruletypesRuleConditionDTO';
import type { RuletypesRuleDTOAnnotations } from './ruletypesRuleDTOAnnotations';
import type { RuletypesRuleDTOLabels } from './ruletypesRuleDTOLabels';
import type { RuletypesRuleDTOSchemaVersion } from './ruletypesRuleDTOSchemaVersion';
import type { RuletypesRuleTypeDTO } from './ruletypesRuleTypeDTO';

export interface RuletypesRuleDTO {
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
	 * @type object
	 * @description Free text attached to every alert, conventionally summary and description. Values may use Go templates with $value, $threshold and $labels.
	 */
	annotations?: RuletypesRuleDTOAnnotations;
	/**
	 * @description The query to evaluate and the thresholds applied to its result.
	 */
	condition: RuletypesRuleConditionDTO;
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
	 * @description Whether the rule is paused. A disabled rule is neither evaluated nor notifies. Defaults to false.
	 */
	disabled?: boolean;
	/**
	 * @description The evaluation window, as a kind and spec.
	 */
	evaluation: RuletypesEvaluationEnvelopeDTO;
	/**
	 * @type string
	 * @description The unique identifier of the rule.
	 */
	id: string;
	/**
	 * @type object
	 * @description Labels attached to every alert the rule fires. Keys match [a-zA-Z_.][a-zA-Z0-9_.]*; values may use Go templates such as {{$labels.service_name}}. A label named after one the engine writes, such as severity or threshold.name, is ignored.
	 */
	labels?: RuletypesRuleDTOLabels;
	/**
	 * @description Grouping, re-notification and routing behaviour.
	 */
	notificationSettings: RuletypesNotificationSettingsDTO;
	/**
	 * @description The evaluation strategy: threshold_rule compares against thresholds, promql_rule evaluates a PromQL expression, anomaly_rule scores deviation from seasonal history. Defaults to threshold_rule for builder and clickhouse_sql queries and is forced to promql_rule for promql queries.
	 */
	ruleType: RuletypesRuleTypeDTO;
	/**
	 * @enum v2alpha1
	 * @type string
	 * @description The rule payload schema.
	 */
	schemaVersion: RuletypesRuleDTOSchemaVersion;
	/**
	 * @description The current evaluation state: inactive, pending, recovering, firing, nodata or disabled.
	 */
	state: RuletypesAlertStateDTO;
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
