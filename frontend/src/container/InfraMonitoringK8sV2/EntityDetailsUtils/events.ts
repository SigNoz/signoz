import type {
	InfraMonitoringEntity,
	VIEWS,
} from 'container/InfraMonitoringK8sV2/constants';
import logEvent from 'api/common/logEvent';
import { extractQueryPairs } from 'utils/queryContextUtils';
import { isCustomTimeRange } from 'store/globalTime';

export function logInfraDrawerTimeRangeCustomizedEvent(
	entityType: InfraMonitoringEntity,
	rangeLabel: string,
): void {
	void logEvent('Infra Monitoring: Drawer time range customized', {
		entityType,
		rangeLabel: isCustomTimeRange(rangeLabel) ? 'custom' : rangeLabel,
	});
}

export function logInfraDrawerFilterCustomizedEvent(
	entityType: InfraMonitoringEntity,
	tab: `${VIEWS}`,
	expression: string,
	filterSource: 'search' | 'logs',
): void {
	const expressionKeys = extractQueryPairs(expression?.trim() || '').map(
		(pair) => pair.key,
	);

	if (expressionKeys.length === 0) {
		return;
	}

	void logEvent('Infra Monitoring: Drawer filter customized', {
		entityType,
		tab,
		expressionKeys: [...new Set(expressionKeys)],
		filterSource,
	});
}

export function logInfraDrawerTabViewedEvent(
	entityType: InfraMonitoringEntity,
	tab: string,
	isDefaultTab: boolean,
): void {
	void logEvent('Infra Monitoring: Drawer tab viewed', {
		entityType,
		tab,
		isDefaultTab,
	});
}

export function logInfraDrawerTraceClickedEvent(
	entityType: InfraMonitoringEntity,
): void {
	void logEvent('Infra Monitoring: Drawer trace clicked', {
		entityType,
	});
}
