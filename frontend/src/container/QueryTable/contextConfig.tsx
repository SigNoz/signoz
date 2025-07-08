import { QUERY_BUILDER_OPERATORS_BY_TYPES } from 'constants/queryBuilder';
import BreakoutOptions from 'container/QueryTable/BreakoutOptions';
import { getBaseMeta } from 'container/QueryTable/drilldownUtils';
import ContextMenu from 'periscope/components/ContextMenu';
import { ReactNode } from 'react';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQuery, Query } from 'types/api/queryBuilder/queryBuilderData';

import { AGGREGATE_OPTIONS, SUPPORTED_OPERATORS } from './menuOptions';
import {
	getBreakoutQuery,
	getFiltersToAdd,
	getQueryData,
} from './tableDrilldownUtils';

export type ContextMenuItem = ReactNode;

export enum ConfigType {
	GROUP = 'group',
	AGGREGATE = 'aggregate',
}

export interface ContextMenuConfigParams {
	configType: ConfigType;
	query: Query;
	clickedData: any;
	panelType?: string;
	onColumnClick: (key: string, query?: Query) => void;
	subMenu?: string;
}

export interface GroupContextMenuConfig {
	header?: string;
	items?: ContextMenuItem;
}

export interface AggregateContextMenuConfig {
	header?: string;
	items?: ContextMenuItem;
}

export interface BreakoutOptionsProps {
	queryData: IBuilderQuery;
	onColumnClick: (groupBy: BaseAutocompleteData) => void;
}

function getGroupContextMenuConfig({
	query,
	clickedData,
	panelType,
	onColumnClick,
}: Omit<ContextMenuConfigParams, 'configType'>): GroupContextMenuConfig {
	const filterKey = clickedData?.column?.dataIndex;
	const header = `Filter by ${filterKey}`;

	const filterDataType = getBaseMeta(query, filterKey)?.dataType || 'string';

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

function getAggregateContextMenuConfig({
	subMenu,
	query,
	clickedData,
	onColumnClick,
}: Omit<ContextMenuConfigParams, 'configType'>): AggregateContextMenuConfig {
	console.log('getAggregateContextMenuConfig', { clickedData, query });

	if (subMenu === 'breakout') {
		const queryData = getQueryData(query, clickedData);
		return {
			header: 'Breakout by',
			items: (
				<BreakoutOptions
					queryData={queryData}
					onColumnClick={(groupBy: BaseAutocompleteData): void => {
						const filtersToAdd = getFiltersToAdd(query, clickedData);
						const breakoutQuery = getBreakoutQuery(
							query,
							clickedData,
							groupBy,
							filtersToAdd,
						);
						onColumnClick('breakout', breakoutQuery);
					}}
				/>
			),
		};
	}

	return {
		header: 'Aggregate by',
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

export function getContextMenuConfig({
	subMenu,
	configType,
	query,
	clickedData,
	panelType,
	onColumnClick,
}: ContextMenuConfigParams): { header?: string; items?: ContextMenuItem } {
	if (configType === ConfigType.GROUP) {
		return getGroupContextMenuConfig({
			query,
			clickedData,
			panelType,
			onColumnClick,
		});
	}

	if (configType === ConfigType.AGGREGATE) {
		return getAggregateContextMenuConfig({
			subMenu,
			query,
			clickedData,
			panelType,
			onColumnClick,
		});
	}

	return {};
}
