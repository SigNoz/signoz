import type { InfraMonitoringEntity } from 'container/InfraMonitoringK8sV2/constants';
import logEvent from 'api/common/logEvent';
import { getNavigationReferrer } from 'lib/navigation';
import { extractQueryPairs } from 'utils/queryContextUtils';
import { isCustomTimeRange } from 'store/globalTime';

export function logInfraFilterCustomizedEvent(
	entityType: InfraMonitoringEntity,
	source: 'quick_filter' | 'search' | 'host_status_toggle' | 'status_filter',
	expression: string,
	extraKeys?: string[],
): void {
	const expressionKeys = extractQueryPairs(expression?.trim() || '').map(
		(pair) => pair.key,
	);

	if (extraKeys) {
		extraKeys.forEach((key) => expressionKeys.push(key));
	}

	if (expressionKeys.length === 0) {
		return;
	}

	void logEvent('Infra Monitoring: Filter customized', {
		entityType,
		source,
		expressionKeys: [...new Set(expressionKeys)],
	});
}

export function logInfraMonitoringListViewedEvent(
	entity: InfraMonitoringEntity,
): void {
	const referrer = getNavigationReferrer();

	void logEvent('Infra Monitoring: List viewed', {
		entityType: entity,
		referrer,
	});
}

export function logInfraTimeRangeCustomizedEvent(
	entityType: InfraMonitoringEntity,
	rangeLabel: string,
): void {
	void logEvent('Infra Monitoring: Time range customized', {
		entityType,
		rangeLabel: isCustomTimeRange(rangeLabel) ? 'custom' : rangeLabel,
	});
}

export function logInfraColumnCustomizedEvent(
	entityType: InfraMonitoringEntity,
	columnsList: string[],
	fontSize: string,
	maxLinesPerRow: number,
	source: 'list' | 'expanded',
): void {
	void logEvent('Infra Monitoring: Column customized', {
		entityType,
		columnsList,
		fontSize,
		maxLinesPerRow,
		source,
	});
}

export function logInfraColumnSortedEvent(
	entityType: InfraMonitoringEntity,
	columnKey: string,
	direction: 'asc' | 'desc',
	source: 'list' | 'expanded',
): void {
	void logEvent('Infra Monitoring: Column sorted', {
		entityType,
		columnKey,
		direction,
		source,
	});
}

export function logInfraGroupByCustomizedEvent(
	entityType: InfraMonitoringEntity,
	groupByKeysList: string[],
): void {
	void logEvent('Infra Monitoring: Group by customized', {
		entityType,
		groupByKeysList,
	});
}

export function logInfraExplorerNavigatedEvent(params: {
	entityType: InfraMonitoringEntity;
	destination:
		| 'metrics_explorer'
		| 'logs_explorer'
		| 'traces_explorer'
		| 'k8s_list';
	source:
		| 'chart_compass_icon'
		| 'tab_cta_button'
		| 'stats_card'
		| 'overview_cta';
	tab: string;
	sourceKey: string | null;
	drawerDurationMsAtNavigation: number | null;
}): void {
	void logEvent('Infra Monitoring: Explorer navigated', {
		entityType: params.entityType,
		destination: params.destination,
		source: params.source,
		tab: params.tab,
		sourceKey: params.sourceKey,
		drawerDurationMsAtNavigation: params.drawerDurationMsAtNavigation,
	});
}

export function logInfraListRowClickedEvent(
	entityType: InfraMonitoringEntity,
	openedInNewTab: boolean,
	isGrouped: boolean,
): void {
	void logEvent('Infra Monitoring: List row clicked', {
		entityType,
		openedInNewTab,
		isGrouped,
	});
}
