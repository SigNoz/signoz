import { QUERY_BUILDER_OPERATORS_BY_TYPES } from 'constants/queryBuilder';
import ContextMenu, { ClickedData } from 'periscope/components/ContextMenu';
import { ReactNode } from 'react';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQuery, Query } from 'types/api/queryBuilder/queryBuilderData';

import BreakoutOptions from './BreakoutOptions';
import {
	getAggregateColumnHeader,
	getBaseMeta,
	getQueryData,
} from './drilldownUtils';
import { AGGREGATE_OPTIONS, SUPPORTED_OPERATORS } from './menuOptions';
import { getBreakoutQuery } from './tableDrilldownUtils';
import { AggregateData } from './useAggregateDrilldown';

export type ContextMenuItem = ReactNode;

export enum ConfigType {
	GROUP = 'group',
	AGGREGATE = 'aggregate',
}

export interface ContextMenuConfigParams {
	configType: ConfigType;
	query: Query;
	clickedData: ClickedData;
	panelType?: string;
	onColumnClick: (key: string, query?: Query) => void;
	subMenu?: string;
}

export interface GroupContextMenuConfig {
	header?: string;
	items?: ContextMenuItem;
}

export interface AggregateContextMenuConfig {
	header?: string | ReactNode;
	items?: ContextMenuItem;
}

export interface BreakoutOptionsProps {
	queryData: IBuilderQuery;
	onColumnClick: (groupBy: BaseAutocompleteData) => void;
}

export function getGroupContextMenuConfig({
	query,
	clickedData,
	panelType,
	onColumnClick,
}: Omit<ContextMenuConfigParams, 'configType'>): GroupContextMenuConfig {
	const filterKey = clickedData?.column?.dataIndex;
	const header = `Filter by ${filterKey}`;

	const filterDataType =
		getBaseMeta(query, filterKey as string)?.dataType || 'string';

	const operators =
		QUERY_BUILDER_OPERATORS_BY_TYPES[
			filterDataType as keyof typeof QUERY_BUILDER_OPERATORS_BY_TYPES
		];

	const filterOperators = operators.filter(
		(operator) => SUPPORTED_OPERATORS[operator],
	);

	if (
		panelType === 'table' &&
		clickedData?.column &&
		!(clickedData.column as any).queryName
	) {
		return {
			header,
			items: filterOperators.map((operator) => (
				<ContextMenu.Item
					key={operator}
					icon={SUPPORTED_OPERATORS[operator].icon}
					onClick={(): void => onColumnClick(SUPPORTED_OPERATORS[operator].value)}
				>
					{SUPPORTED_OPERATORS[operator].label}
				</ContextMenu.Item>
			)),
		};
	}

	return {};
}

export function getAggregateContextMenuConfig({
	subMenu,
	query,
	onColumnClick,
	aggregateData,
}: {
	subMenu?: string;
	query: Query;
	onColumnClick: (key: string, query?: Query) => void;
	aggregateData: AggregateData | null;
}): AggregateContextMenuConfig {
	console.log('getAggregateContextMenuConfig', { query, aggregateData });

	if (subMenu === 'breakout') {
		const queryData = getQueryData(query, aggregateData?.queryName || '');
		return {
			header: 'Breakout by',
			items: (
				<BreakoutOptions
					queryData={queryData}
					onColumnClick={(groupBy: BaseAutocompleteData): void => {
						// Use aggregateData.filters
						const filtersToAdd = aggregateData?.filters || [];
						const breakoutQuery = getBreakoutQuery(
							query,
							aggregateData,
							groupBy,
							filtersToAdd,
						);
						onColumnClick('breakout', breakoutQuery);
					}}
				/>
			),
		};
	}

	// Use aggregateData.queryName
	const queryName = aggregateData?.queryName;
	const { dataSource, aggregations } = getAggregateColumnHeader(
		query,
		queryName as string,
	);

	console.log('dataSource', dataSource);
	console.log('aggregations', aggregations);

	return {
		header: (
			<div>
				<div style={{ textTransform: 'capitalize' }}>{dataSource}</div>
				<div>{aggregations}</div>
			</div>
		),
		items: AGGREGATE_OPTIONS.map(({ key, label, icon }) => (
			<ContextMenu.Item
				key={key}
				icon={icon}
				onClick={(): void => onColumnClick(key)}
			>
				{label}
			</ContextMenu.Item>
		)),
	};
}
