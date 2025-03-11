import { MetricsTreeMapResponse } from 'api/metricsExplorer/getMetricsTreeMap';
import React, { Dispatch, SetStateAction } from 'react';
import {
	IBuilderQuery,
	TagFilter,
} from 'types/api/queryBuilder/queryBuilderData';

export interface MetricsTableProps {
	isLoading: boolean;
	data: MetricsListItemRowData[];
	pageSize: number;
	currentPage: number;
	onPaginationChange: (page: number, pageSize: number) => void;
	setOrderBy: Dispatch<SetStateAction<OrderByPayload>>;
	totalCount: number;
	openMetricDetails: (metricName: string) => void;
}

export interface MetricsSearchProps {
	query: IBuilderQuery;
	onChange: (value: TagFilter) => void;
	heatmapView: TreemapViewType;
	setHeatmapView: (value: TreemapViewType) => void;
}

export interface MetricsTreemapProps {
	data: MetricsTreeMapResponse | null | undefined;
	isLoading: boolean;
	viewType: TreemapViewType;
	openMetricDetails: (metricName: string) => void;
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
	CARDINALITY = 'timeseries',
	DATAPOINTS = 'samples',
}

export interface TreemapTile {
	id: string;
	size: number;
	displayValue: number | string | null;
	parent: string | null;
}
