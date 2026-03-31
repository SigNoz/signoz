import React from 'react';
import {
	MetricsexplorertypesTreemapModeDTO,
	MetricsexplorertypesTreemapResponseDTO,
	Querybuildertypesv5OrderByDTO,
} from 'api/generated/services/sigNoz.schemas';
import { Filter } from 'api/v5/v5';
import APIError from 'types/api/error';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

export interface MetricsTableProps {
	isLoading: boolean;
	isError: boolean;
	error?: APIError;
	data: MetricsListItemRowData[];
	pageSize: number;
	currentPage: number;
	onPaginationChange: (page: number, pageSize: number) => void;
	setOrderBy: (orderBy: Querybuildertypesv5OrderByDTO) => void;
	totalCount: number;
	openMetricDetails: (
		metricName: string,
		view: 'list' | 'treemap',
		event?: React.MouseEvent,
	) => void;
	queryFilterExpression: Filter;
	onFilterChange: (expression: string) => void;
}

export interface MetricsSearchProps {
	query: IBuilderQuery;
	onChange: (expression: string) => void;
	currentQueryFilterExpression: string;
	setCurrentQueryFilterExpression: (expression: string) => void;
	isLoading: boolean;
}

export interface MetricsTreemapProps {
	data: MetricsexplorertypesTreemapResponseDTO | undefined;
	isLoading: boolean;
	isError: boolean;
	error?: APIError;
	viewType: MetricsexplorertypesTreemapModeDTO;
	openMetricDetails: (
		metricName: string,
		view: 'list' | 'treemap',
		event?: React.MouseEvent,
	) => void;
	setHeatmapView: (value: MetricsexplorertypesTreemapModeDTO) => void;
}

export interface MetricsTreemapInternalProps {
	isLoading: boolean;
	isError: boolean;
	error?: APIError;
	data: MetricsexplorertypesTreemapResponseDTO | undefined;
	viewType: MetricsexplorertypesTreemapModeDTO;
	openMetricDetails: (
		metricName: string,
		view: 'list' | 'treemap',
		event?: React.MouseEvent,
	) => void;
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
