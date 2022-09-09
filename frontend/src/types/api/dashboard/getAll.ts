import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import { timePreferenceType } from 'container/NewWidget/RightContainer/timeItems';
import { Layout } from 'react-grid-layout';
import {
	EAggregateOperator,
	EQueryType,
	EReduceOperator,
} from 'types/common/dashboard';

import { QueryData } from '../widgets/getQuery';

export type PayloadProps = Dashboard[];

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
	promQL: IPromQLQuery[];
	metricsBuilder: {
		formulas: IMetricsBuilderFormula[];
		queryBuilder: IMetricsBuilderQuery[];
	};
	clickHouse: IClickHouseQuery[];
}

export interface IMetricsBuilderFormula {
	expression: string;
	disabled: boolean;
	name: string;
	legend: string;
}
export interface IMetricsBuilderQuery {
	aggregateOperator: EAggregateOperator;
	disabled: boolean;
	name: string;
	legend: string;
	metricName: string | null;
	groupBy?: string[];
	tagFilters: IQueryBuilderTagFilters;
	reduceTo?: EReduceOperator;
}

export interface IQueryBuilderTagFilters {
	op: string;
	items:
		| {
				id: string;
				key: string;
				op: string;
				value: string[];
		  }[]
		| [];
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
