import { PANEL_TYPES } from 'constants/queryBuilder';
import { ThresholdProps } from 'container/NewWidget/RightContainer/Threshold/types';
import { timePreferenceType } from 'container/NewWidget/RightContainer/timeItems';
import { ReactNode } from 'react';
import { Layout } from 'react-grid-layout';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

export type PayloadProps = Dashboard[];

export const VariableQueryTypeArr = ['QUERY', 'TEXTBOX', 'CUSTOM'] as const;
export type TVariableQueryType = typeof VariableQueryTypeArr[number];

export const VariableSortTypeArr = ['DISABLED', 'ASC', 'DESC'] as const;
export type TSortVariableValuesType = typeof VariableSortTypeArr[number];

export interface IDashboardVariable {
	id: string;
	order?: any;
	name?: string; // key will be the source of truth
	description: string;
	type: TVariableQueryType;
	// Query
	queryValue?: string;
	// Custom
	customValue?: string;
	// Textbox
	textboxValue?: string;

	sort: TSortVariableValuesType;
	multiSelect: boolean;
	showALLOption: boolean;
	selectedValue?:
		| null
		| string
		| number
		| boolean
		| (string | number | boolean)[];
	// Internal use
	modificationUUID?: string;
	allSelected?: boolean;
	change?: boolean;
}
export interface Dashboard {
	id: number;
	uuid: string;
	created_at: string;
	updated_at: string;
	created_by: string;
	updated_by: string;
	data: DashboardData;
	isLocked?: boolean;
}

export interface DashboardData {
	description?: string;
	tags?: string[];
	name?: string;
	widgets?: Widgets[];
	title: string;
	layout?: Layout[];
	variables: Record<string, IDashboardVariable>;
}

export interface IBaseWidget {
	isStacked: boolean;
	id: string;
	panelTypes: PANEL_TYPES;
	title: ReactNode;
	description: string;
	opacity: string;
	nullZeroValues: string;
	timePreferance: timePreferenceType;
	stepSize?: number;
	yAxisUnit?: string;
	thresholds?: ThresholdProps[];
	fillSpans?: boolean;
}
export interface Widgets extends IBaseWidget {
	query: Query;
}

export interface PromQLWidgets extends IBaseWidget {
	query: { query: string; legend: string }[];
}

export interface IQueryBuilderTagFilterItems {
	id: string;
	key: string;
	op: string;
	value: string[];
}
