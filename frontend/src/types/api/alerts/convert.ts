import type {
	RuletypesAlertCompositeQueryDTO,
	RuletypesPostableRuleDTO,
	RuletypesPostableRuleDTOLabels,
	RuletypesRuleDTO,
} from 'api/generated/services/sigNoz.schemas';
import {
	RuletypesAlertTypeDTO,
	RuletypesPanelTypeDTO,
	RuletypesQueryTypeDTO,
	RuletypesRuleTypeDTO,
} from 'api/generated/services/sigNoz.schemas';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { EQueryType } from 'types/common/dashboard';

import { AlertTypes } from './alertTypes';
import { PostableAlertRuleV2 } from './alertTypesV2';
import { ICompositeMetricQuery } from './compositeQuery';
import { AlertDef, Labels } from './def';

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
	const payload = {
		alert: local.alert,
		alertType: toAlertTypeDTO(local.alertType),
		ruleType: toRuleTypeDTO(local.ruleType),
		condition: local.condition,
		annotations: local.annotations,
		labels: stripUndefinedLabels(local.labels),
		notificationSettings: local.notificationSettings,
		evaluation: local.evaluation,
		schemaVersion: local.schemaVersion,
		source: local.source,
		version: local.version,
		disabled: local.disabled,
	};
	return (payload as unknown) as RuletypesPostableRuleDTO;
}

export function toPostableRuleDTOFromAlertDef(
	local: AlertDef,
): RuletypesPostableRuleDTO {
	const payload = {
		alert: local.alert,
		alertType: toAlertTypeDTO(local.alertType),
		ruleType: toRuleTypeDTO(local.ruleType),
		condition: local.condition,
		annotations: local.annotations,
		labels: stripUndefinedLabels(local.labels),
		evalWindow: local.evalWindow,
		frequency: local.frequency,
		preferredChannels: local.preferredChannels,
		source: local.source,
		version: local.version,
		disabled: local.disabled,
	};
	return (payload as unknown) as RuletypesPostableRuleDTO;
}

export function fromRuleDTOToPostableRuleV2(
	dto: RuletypesRuleDTO,
): PostableAlertRuleV2 {
	return (dto as unknown) as PostableAlertRuleV2;
}

export function fromRuleDTOToAlertDef(dto: RuletypesRuleDTO): AlertDef {
	return (dto as unknown) as AlertDef;
}

function toEQueryType(queryType: RuletypesQueryTypeDTO): EQueryType {
	switch (queryType) {
		case RuletypesQueryTypeDTO.builder:
			return EQueryType.QUERY_BUILDER;
		case RuletypesQueryTypeDTO.clickhouse_sql:
			return EQueryType.CLICKHOUSE;
		case RuletypesQueryTypeDTO.promql:
			return EQueryType.PROM;
		default:
			return EQueryType.QUERY_BUILDER;
	}
}

function toPanelType(panelType: RuletypesPanelTypeDTO): PANEL_TYPES {
	switch (panelType) {
		case RuletypesPanelTypeDTO.value:
			return PANEL_TYPES.VALUE;
		case RuletypesPanelTypeDTO.table:
			return PANEL_TYPES.TABLE;
		case RuletypesPanelTypeDTO.graph:
		default:
			return PANEL_TYPES.TIME_SERIES;
	}
}

export function toCompositeMetricQuery(
	dto: RuletypesAlertCompositeQueryDTO,
): ICompositeMetricQuery {
	return {
		queryType: toEQueryType(dto.queryType),
		panelType: toPanelType(dto.panelType),
		unit: dto.unit,
		queries: (dto.queries ?? undefined) as ICompositeMetricQuery['queries'],
	};
}
