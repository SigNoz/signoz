import type {
	RuletypesPostableRuleDTO,
	RuletypesPostableRuleDTOLabels,
	RuletypesRuleDTO,
} from 'api/generated/services/sigNoz.schemas';
import {
	RuletypesAlertTypeDTO,
	RuletypesRuleTypeDTO,
} from 'api/generated/services/sigNoz.schemas';

import { AlertTypes, PostableAlertRuleV2 } from './alertTypes';
import { Labels } from './def';

function toRuleTypeDTO(ruleType: string | undefined): RuletypesRuleTypeDTO {
	switch (ruleType) {
		case RuletypesRuleTypeDTO.promql_rule:
			return RuletypesRuleTypeDTO.promql_rule;
		case RuletypesRuleTypeDTO.anomaly_rule:
			return RuletypesRuleTypeDTO.anomaly_rule;
		default:
			return RuletypesRuleTypeDTO.threshold_rule;
	}
}

function toAlertTypeDTO(
	alertType: AlertTypes | string | undefined,
): RuletypesAlertTypeDTO | undefined {
	switch (alertType) {
		case AlertTypes.METRICS_BASED_ALERT:
			return RuletypesAlertTypeDTO.METRIC_BASED_ALERT;
		case AlertTypes.LOGS_BASED_ALERT:
			return RuletypesAlertTypeDTO.LOGS_BASED_ALERT;
		case AlertTypes.TRACES_BASED_ALERT:
			return RuletypesAlertTypeDTO.TRACES_BASED_ALERT;
		case AlertTypes.EXCEPTIONS_BASED_ALERT:
			return RuletypesAlertTypeDTO.EXCEPTIONS_BASED_ALERT;
		default:
			return undefined;
	}
}

function stripUndefinedLabels(
	labels: Labels | undefined,
): RuletypesPostableRuleDTOLabels | undefined {
	if (!labels) {
		return undefined;
	}
	const out: RuletypesPostableRuleDTOLabels = {};
	Object.entries(labels).forEach(([key, value]) => {
		if (typeof value === 'string') {
			out[key] = value;
		}
	});
	return out;
}

// why: local PostableAlertRuleV2/AlertDef diverge from RuletypesPostableRuleDTO
// in several spots that match by string value but not by nominal TS type —
// condition.{op,matchType}, evaluation.kind, notificationSettings.renotify.alertStates.
// The backend accepts the local runtime shape, so one boundary cast encapsulates
// the type-surface gap rather than leaking it to call sites.
export function toPostableRuleDTO(
	local: PostableAlertRuleV2,
): RuletypesPostableRuleDTO {
	const payload: Record<
		Exclude<keyof RuletypesPostableRuleDTO, 'source' | 'version'>,
		any
	> = {
		alert: local.alert,
		alertType: toAlertTypeDTO(local.alertType),
		ruleType: toRuleTypeDTO(local.ruleType),
		condition: local.condition,
		annotations: local.annotations,
		labels: stripUndefinedLabels(local.labels),
		notificationSettings: local.notificationSettings,
		evaluation: local.evaluation,
		schemaVersion: local.schemaVersion,
		disabled: local.disabled,
		description: (local as unknown as RuletypesPostableRuleDTO).description,
	};
	return payload as unknown as RuletypesPostableRuleDTO;
}

export function fromRuleDTOToPostableRuleV2(
	dto: RuletypesRuleDTO,
): PostableAlertRuleV2 {
	return dto as unknown as PostableAlertRuleV2;
}
