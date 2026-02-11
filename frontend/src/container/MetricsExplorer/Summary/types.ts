import React from 'react';
import {
	MetricsexplorertypesTreemapModeDTO,
	MetricsexplorertypesTreemapResponseDTO,
	Querybuildertypesv5OrderByDTO,
} from 'api/generated/services/sigNoz.schemas';
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
	setOrderBy: (orderBy: Querybuildertypesv5OrderByDTO) => void;
	totalCount: number;
	openMetricDetails: (metricName: string, view: 'list' | 'treemap') => void;
	queryFilters: TagFilter;
}

export interface MetricsSearchProps {
	query: IBuilderQuery;
	onChange: (value: TagFilter) => void;
}

export interface MetricsTreemapProps {
	data: MetricsexplorertypesTreemapResponseDTO | null | undefined;
	isLoading: boolean;
	isError: boolean;
	viewType: MetricsexplorertypesTreemapModeDTO;
	openMetricDetails: (metricName: string, view: 'list' | 'treemap') => void;
	setHeatmapView: (value: MetricsexplorertypesTreemapModeDTO) => void;
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
