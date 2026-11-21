/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { RuletypesAlertTypeDTO } from './ruletypesAlertTypeDTO';
import type { RuletypesEvaluationEnvelopeDTO } from './ruletypesEvaluationEnvelopeDTO';
import type { RuletypesNotificationSettingsDTO } from './ruletypesNotificationSettingsDTO';
import type { RuletypesPostableRuleDTOAnnotations } from './ruletypesPostableRuleDTOAnnotations';
import type { RuletypesPostableRuleDTOLabels } from './ruletypesPostableRuleDTOLabels';
import type { RuletypesPostableRuleDTOSchemaVersion } from './ruletypesPostableRuleDTOSchemaVersion';
import type { RuletypesRuleConditionDTO } from './ruletypesRuleConditionDTO';
import type { RuletypesRuleTypeDTO } from './ruletypesRuleTypeDTO';

export interface RuletypesPostableRuleDTO {
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
	annotations?: RuletypesPostableRuleDTOAnnotations;
	/**
	 * @description The query to evaluate and the thresholds applied to its result.
	 */
	condition: RuletypesRuleConditionDTO;
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
	 * @type object
	 * @description Labels attached to every alert the rule fires. Keys match [a-zA-Z_.][a-zA-Z0-9_.]*; values may use Go templates such as {{$labels.service_name}}. A label named after one the engine writes, such as severity or threshold.name, is ignored.
	 */
	labels?: RuletypesPostableRuleDTOLabels;
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
	schemaVersion: RuletypesPostableRuleDTOSchemaVersion;
}
