import {
	PANEL_TYPES,
	QUERY_BUILDER_OPERATORS_BY_TYPES,
} from 'constants/queryBuilder';
import ContextMenu, { ClickedData } from 'periscope/components/ContextMenu';
import { ReactNode } from 'react';
import { IBuilderQuery, Query } from 'types/api/queryBuilder/queryBuilderData';

import { getBaseMeta } from './drilldownUtils';
import { SUPPORTED_OPERATORS } from './menuOptions';
import { BreakoutAttributeType } from './types';

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
	onColumnClick: (groupBy: BreakoutAttributeType) => void;
}

export function getGroupContextMenuConfig({
	query,
	clickedData,
	panelType,
	onColumnClick,
}: Omit<ContextMenuConfigParams, 'configType'>): GroupContextMenuConfig {
	const filterKey = clickedData?.column?.dataIndex;

	const filterDataType =
		getBaseMeta(query, filterKey as string)?.dataType || 'string';

	const operators =
		QUERY_BUILDER_OPERATORS_BY_TYPES[
			filterDataType as keyof typeof QUERY_BUILDER_OPERATORS_BY_TYPES
		];

	const filterOperators = operators.filter(
		(operator) => SUPPORTED_OPERATORS[operator],
	);

	if (panelType === PANEL_TYPES.TABLE && clickedData?.column) {
		return {
			items: (
				<>
					<ContextMenu.Header>
						<div>Filter by {filterKey}</div>
					</ContextMenu.Header>
					{filterOperators.map((operator) => (
						<ContextMenu.Item
							key={operator}
							icon={SUPPORTED_OPERATORS[operator].icon}
							onClick={(): void => onColumnClick(SUPPORTED_OPERATORS[operator].value)}
						>
							{SUPPORTED_OPERATORS[operator].label}
						</ContextMenu.Item>
					))}
				</>
			),
		};
	}

	return {};
}
