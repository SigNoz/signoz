import { ReactNode } from 'react';
import {
	CustomTimeType,
	Time,
} from 'container/TopNav/DateTimeSelectionV2/types';
import { InfraMonitoringEvents } from 'constants/events';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import APIError from 'types/api/error';

import { EntityCountConfig } from './components/EntityCountsSection/EntityCountsSection';
import { InfraMonitoringEntity } from '../constants';
import { SelectedItemParams } from '../hooks';

export type K8sDetailsCountConfig<T> = EntityCountConfig<T>;

export type K8sBaseFilters = {
	filter: {
		expression: string;
		filterByStatus?: 'active' | 'inactive' | '';
	};
	groupBy?: Array<{ name: string }>;
	offset?: number;
	limit?: number;
	start: number;
	end: number;
	orderBy?: {
		key: { name: string };
		direction: 'asc' | 'desc';
	};
};

export type K8sListResponse<T> = {
	type: 'list' | 'grouped_list';
	records: T[];
	total: number;
	endTimeBeforeRetention?: boolean;
	error?: string | null;
};

/**
 * Type for table row data with required key fields.
 * Used when rendering raw data in the table.
 */
export type K8sTableRowData<T> = T & {
	key: string;
	id: string;
	itemKey: string;
	/** Metadata about which attributes were used for grouping */
	groupedByMeta?: Record<string, string>;
};

export interface K8sDetailsMetadataConfig<T> {
	label: string;
	getValue: (entity: T) => string | number;
	render?: (value: string | number, entity: T) => ReactNode;
}

export interface K8sDetailsFilters {
	filter: { expression: string };
	start: number;
	end: number;
}

export interface K8sDetailsWidgetInfo {
	title: string;
	yAxisUnit: string;
}

export type GetEntityQueryPayload<T> = (
	entity: T,
	start: number,
	end: number,
	dotMetricsEnabled: boolean,
) => GetQueryResultsProps[];

export interface K8sDetailsTabsConfig {
	showMetrics?: boolean;
	showLogs?: boolean;
	showTraces?: boolean;
	showEvents?: boolean;
}

export interface K8sDetailsCustomTabRenderProps<T> {
	entity: T;
	/** Time range in seconds — see useEntityDetailsTime */
	timeRange: { startTime: number; endTime: number };
	selectedInterval: Time;
	handleTimeChange: (
		interval: Time | CustomTimeType,
		dateTimeRange?: [number, number],
	) => void;
}

export interface K8sDetailsCustomTab<T> {
	key: string;
	label: string;
	icon: ReactNode;
	render: (props: K8sDetailsCustomTabRenderProps<T>) => ReactNode;
}

export interface K8sBaseDetailsProps<T> {
	category: InfraMonitoringEntity;
	eventCategory: InfraMonitoringEvents;
	// Data fetching configuration
	getSelectedItemExpression: (params: SelectedItemParams) => string;
	fetchEntityData: (
		filters: K8sDetailsFilters,
		signal?: AbortSignal,
	) => Promise<{ data: T | null; error?: APIError | null }>;
	// Entity configuration
	getEntityName: (entity: T) => string;
	getInitialLogTracesExpression: (entity: T) => string;
	getInitialEventsExpression: (entity: T) => string;
	metadataConfig: K8sDetailsMetadataConfig<T>[];
	countsConfig?: K8sDetailsCountConfig<T>[];
	getCountsFilterExpression?: (entity: T) => string;
	entityWidgetInfo: K8sDetailsWidgetInfo[];
	getEntityQueryPayload: GetEntityQueryPayload<T>;
	queryKeyPrefix: string;
	/** When true, only metrics are shown and the Metrics/Logs/Traces/Events tab bar is hidden. */
	hideDetailViewTabs?: boolean;
	tabsConfig?: K8sDetailsTabsConfig;
	customTabs?: K8sDetailsCustomTab<T>[];
}

export interface K8sBaseDetailsContentProps<T> {
	entity: T;
	category: InfraMonitoringEntity;
	eventCategory: InfraMonitoringEvents;
	metadataConfig: K8sDetailsMetadataConfig<T>[];
	countsConfig?: K8sDetailsCountConfig<T>[];
	getCountsFilterExpression?: (entity: T) => string;
	selectedItem: string | null;
	handleClose: () => void;
	entityWidgetInfo: K8sDetailsWidgetInfo[];
	getEntityQueryPayload: GetEntityQueryPayload<T>;
	queryKeyPrefix: string;
	hideDetailViewTabs: boolean;
	tabsConfig?: K8sDetailsTabsConfig;
	customTabs?: K8sDetailsCustomTab<T>[];
	logsAndTracesInitialExpression: string;
	eventsInitialExpression: string;
}

// Aliases for backward compatibility
export type CustomTab<T> = K8sDetailsCustomTab<T>;
export type CustomTabRenderProps<T> = K8sDetailsCustomTabRenderProps<T>;
