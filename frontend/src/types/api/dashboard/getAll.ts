import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import { timePreferenceType } from 'container/NewWidget/RightContainer/timeItems';
import { Layout } from 'react-grid-layout';
import { EQueryType } from 'types/common/dashboard';
import { QueryBuilderData } from 'types/common/queryBuilder';

import { QueryData } from '../widgets/getQuery';

export type PayloadProps = Dashboard[];

export const VariableQueryTypeArr = ['QUERY', 'TEXTBOX', 'CUSTOM'] as const;
export type TVariableQueryType = typeof VariableQueryTypeArr[number];

export const VariableSortTypeArr = ['DISABLED', 'ASC', 'DESC'] as const;
export type TSortVariableValuesType = typeof VariableSortTypeArr[number];

export interface IDashboardVariable {
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
	data: DashboardData;
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
	panelTypes: GRAPH_TYPES;
	title: string;
	description: string;
	opacity: string;
	nullZeroValues: string;
	timePreferance: timePreferenceType;
	queryData: {
		loading: boolean;
		error: boolean;
		errorMessage: string;
		data: {
			query?: string;
			legend?: string;
			queryData: QueryData[];
		};
	};
	stepSize?: number;
	yAxisUnit?: string;
}
export interface Widgets extends IBaseWidget {
	query: Query;
}

export interface PromQLWidgets extends IBaseWidget {
	query: { query: string; legend: string }[];
}
export interface Query {
	queryType: EQueryType;
	promql: IPromQLQuery[];
	builder: QueryBuilderData;
	clickhouse_sql: IClickHouseQuery[];
}

export interface IClickHouseQuery {
	name: string;
	rawQuery: string;
	legend: string;
	disabled: boolean;
}
export interface IPromQLQuery {
	query: string;
	legend: string;
	disabled: boolean;
	name: string;
}

export interface IQueryBuilderTagFilterItems {
	id: string;
	key: string;
	op: string;
	value: string[];
}
