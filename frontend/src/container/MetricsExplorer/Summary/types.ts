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
	setOrderBy: Dispatch<SetStateAction<OrderByPayload | null>>;
}

export interface MetricsSearchProps {
	query: IBuilderQuery;
	onChange: (value: TagFilter) => void;
	heatmapView: TreemapViewType;
	setHeatmapView: (value: TreemapViewType) => void;
}

export interface TreemapProps {
	data: MetricsTreeMapResponse | null | undefined;
	isLoading: boolean;
	viewType: TreemapViewType;
}

export interface OrderByPayload {
	columnName: string;
	order: 'asc' | 'desc';
}

export interface MetricsListItemRowData {
	key: string;
	name: React.ReactNode;
	description: React.ReactNode;
	type: React.ReactNode;
	unit: string;
	dataPoints: number;
	cardinality: number;
}

export type TreemapViewType = 'cardinality' | 'datapoints';

export interface TreemapTile {
	id: string;
	size: number;
	displayValue: number | null;
	parent: string | null;
}
