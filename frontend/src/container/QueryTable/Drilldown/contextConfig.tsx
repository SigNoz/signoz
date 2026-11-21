import type { ReactNode } from 'react';
import { PANEL_TYPES } from 'constants/queryBuilderPanelTypes';
import type { ClickedData } from 'periscope/components/ContextMenu';
import ContextMenu from 'periscope/components/ContextMenu';
import type {
	IBuilderQuery,
	Query,
} from 'types/api/queryBuilder/queryBuilderData';

import { getBaseMeta, getOperatorsByDataType } from './drilldownUtils';
import { SUPPORTED_OPERATORS } from './menuOptions';
import type { BreakoutAttributeType } from './types';

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

	const filterDataType = getBaseMeta(query, filterKey as string)?.dataType;

	const filterOperators = getOperatorsByDataType(filterDataType).filter(
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
