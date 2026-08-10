import { ReactNode } from 'react';
import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

export type ContextMenuItem = ReactNode;

export enum ConfigType {
	GROUP = 'group',
	AGGREGATE = 'aggregate',
}

export interface ContextMenuConfigParams {
	configType: ConfigType;
	query: any; // Query type
	clickedData: any;
	panelType?: string;
	onColumnClick: (operator: string | any) => void; // Query type
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

export interface BreakoutAttributeType {
	key: string;
	/** The picked field's type, in the vocabulary the group-by it becomes is read with. */
	dataType: DataTypes;
	type: string;
}

export interface BreakoutOptionsProps {
	queryData: IBuilderQuery;
	onColumnClick: (groupBy: BaseAutocompleteData) => void;
}
