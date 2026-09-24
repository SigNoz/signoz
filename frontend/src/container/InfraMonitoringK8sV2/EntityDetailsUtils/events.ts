import type { InfraMonitoringEntity } from 'container/InfraMonitoringK8sV2/constants';
import logEvent from 'api/common/logEvent';
import { extractQueryPairs } from 'utils/queryContextUtils';
import { isCustomTimeRange } from 'store/globalTime';

export function logInfraDrawerTimeRangeCustomizedEvent(
	entityType: InfraMonitoringEntity,
	rangeLabel: string,
): void {
	void logEvent('infra_drawer_time_range_customized', {
		entity_type: entityType,
		range_label: isCustomTimeRange(rangeLabel) ? 'custom' : rangeLabel,
	});
}

export function logInfraDrawerFilterCustomizedEvent(
	entityType: InfraMonitoringEntity,
	tab: 'metrics' | 'logs' | 'traces' | 'events' | 'pod_metrics',
	expression: string,
	filterSource: 'search' | 'logs',
): void {
	const expressionKeys = extractQueryPairs(expression?.trim() || '').map(
		(pair) => pair.key,
	);

	if (expressionKeys.length === 0) {
		return;
	}

	void logEvent('infra_drawer_filter_customized', {
		entity_type: entityType,
		tab,
		expression_keys: [...new Set(expressionKeys)],
		filter_source: filterSource,
	});
}

export function logInfraDrawerTabViewedEvent(
	entityType: InfraMonitoringEntity,
	tab: string,
	isDefaultTab: boolean,
): void {
	void logEvent('infra_drawer_tab_viewed', {
		entity_type: entityType,
		tab,
		is_default_tab: isDefaultTab,
	});
}
