import { MetricsTreeMapResponse } from 'api/metricsExplorer/getMetricsTreeMap';
import React from 'react';
import {
	IBuilderQuery,
	TagFilter,
} from 'types/api/queryBuilder/queryBuilderData';

export interface MetricsTableProps {
	isLoading: boolean;
	isError: boolean;
	data: MetricsListItemRowData[];
	pageSize: number;
	currentPage: number;
	onPaginationChange: (page: number, pageSize: number) => void;
	setOrderBy: (orderBy: OrderByPayload) => void;
	totalCount: number;
	openMetricDetails: (metricName: string, view: 'list' | 'treemap') => void;
	queryFilters: TagFilter;
}

export interface MetricsSearchProps {
	query: IBuilderQuery;
	onChange: (value: TagFilter) => void;
}

export interface MetricsTreemapProps {
	data: MetricsTreeMapResponse | null | undefined;
	isLoading: boolean;
	isError: boolean;
	viewType: TreemapViewType;
	openMetricDetails: (metricName: string, view: 'list' | 'treemap') => void;
	setHeatmapView: (value: TreemapViewType) => void;
}

export interface OrderByPayload {
	columnName: string;
	order: 'asc' | 'desc';
}

export interface MetricsListItemRowData {
	key: string;
	metric_name: React.ReactNode;
	description: React.ReactNode;
	metric_type: React.ReactNode;
	unit: React.ReactNode;
	samples: React.ReactNode;
	timeseries: React.ReactNode;
}

export enum TreemapViewType {
	TIMESERIES = 'timeseries',
	SAMPLES = 'samples',
}

export interface TreemapTile {
	id: string;
	size: number;
	displayValue: number | string | null;
	parent: string | null;
}
