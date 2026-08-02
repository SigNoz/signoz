import logEvent from 'api/common/logEvent';
import type { InfraMonitoringEntity } from 'container/InfraMonitoringK8sV2/constants';
import { getNavigationReferrer } from 'lib/navigation';
import { extractQueryPairs } from 'utils/queryContextUtils';
import { isCustomTimeRange } from 'store/globalTime';

export enum Events {
	UPDATE_GRAPH_VISIBILITY_STATE = 'UPDATE_GRAPH_VISIBILITY_STATE',
	UPDATE_GRAPH_MANAGER_TABLE = 'UPDATE_GRAPH_MANAGER_TABLE',
	TABLE_COLUMNS_DATA = 'TABLE_COLUMNS_DATA',
	SLOW_API_WARNING = 'SLOW_API_WARNING',
	TOOLTIP_PINNED = 'TOOLTIP_PINNED',
	TOOLTIP_UNPINNED = 'TOOLTIP_UNPINNED',
	TOOLTIP_CONTENT_SCROLLED = 'TOOLTIP_CONTENT_SCROLLED',
	TOOLTIP_SYNC_MODE_CHANGED = 'TOOLTIP_SYNC_MODE_CHANGED',
}

export enum InfraMonitoringEvents {
	PageVisited = 'Infra Monitoring: page visited',
	PageNumberChanged = 'Infra Monitoring: page number changed',
	GroupByChanged = 'Infra Monitoring: group by changed',
	FilterApplied = 'Infra Monitoring: filter applied',
	ItemClicked = 'Infra Monitoring: item clicked',
	TabChanged = 'Infra Monitoring: tab changed',
	TimeUpdated = 'Infra Monitoring: time updated',
	ExploreClicked = 'Infra Monitoring: explore clicked',
	HostEntity = 'host',
	K8sEntity = 'k8s',
	ListPage = 'list',
	DetailedPage = 'detailed',
	LogsView = 'logs',
	TracesView = 'traces',
	EventsView = 'events',
	QuickFiltersView = 'quick filters',
	MetricsView = 'metrics',
	Total = 'total',
	Cluster = 'cluster',
	DaemonSet = 'daemonSet',
	Deployment = 'deployment',
	Job = 'job',
	Namespace = 'namespace',
	Node = 'node',
	Volume = 'volume',
	Pod = 'pod',
	StatefulSet = 'statefulSet',
	Volumes = 'volumes',
}

export function logInfraFilterCustomizedEvent(
	entityType: InfraMonitoringEntity,
	source: 'quick_filter' | 'search' | 'host_status_toggle',
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

	void logEvent('infra_filter_customized', {
		entity_type: entityType,
		source,
		expression_keys: [...new Set(expressionKeys)],
	});
}

export function logInfraMonitoringListViewedEvent(
	entity: InfraMonitoringEntity,
): void {
	const referrer = getNavigationReferrer();

	void logEvent('infra_list_viewed', {
		entity,
		referrer,
	});
}

export function logInfraTimeRangeCustomizedEvent(
	entityType: InfraMonitoringEntity,
	rangeLabel: string,
): void {
	void logEvent('infra_time_range_customized', {
		entity_type: entityType,
		range_label: isCustomTimeRange(rangeLabel) ? 'custom' : rangeLabel,
	});
}

export function logInfraColumnCustomizedEvent(
	entityType: InfraMonitoringEntity,
	columnsList: string[],
	fontSize: string,
	maxLinesPerRow: number,
	source: 'list' | 'expanded',
): void {
	void logEvent('infra_column_customized', {
		entity_type: entityType,
		columns_list: columnsList,
		font_size: fontSize,
		max_lines_per_row: maxLinesPerRow,
		source,
	});
}

export function logInfraColumnSortedEvent(
	entityType: InfraMonitoringEntity,
	columnKey: string,
	direction: 'asc' | 'desc',
	source: 'list' | 'expanded',
): void {
	void logEvent('infra_column_sorted', {
		entity_type: entityType,
		column_key: columnKey,
		direction,
		source,
	});
}

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

export function logInfraGroupByCustomizedEvent(
	entityType: InfraMonitoringEntity,
	groupByKeysList: string[],
): void {
	void logEvent('infra_group_by_customized', {
		entity_type: entityType,
		group_by_keys_list: groupByKeysList,
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

export function logInfraExplorerNavigatedEvent(params: {
	entityType: InfraMonitoringEntity;
	destination:
		| 'metrics_explorer'
		| 'logs_explorer'
		| 'traces_explorer'
		| 'k8s_list';
	source: 'chart_compass_icon' | 'tab_cta_button' | 'stats_card';
	tab: string;
	sourceKey: string | null;
	drawerDurationMsAtNavigation: number | null;
}): void {
	void logEvent('infra_explorer_navigated', {
		entity_type: params.entityType,
		destination: params.destination,
		source: params.source,
		tab: params.tab,
		source_key: params.sourceKey,
		drawer_duration_ms_at_navigation: params.drawerDurationMsAtNavigation,
	});
}
