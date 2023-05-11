import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import { IClickHouseQuery, IPromQLQuery } from 'types/api/dashboard/getAll';
import { EQueryType } from 'types/common/dashboard';
import { QueryDataResourse } from 'types/common/queryBuilderMappers.types';

export interface ICompositeMetricQuery {
	builderQueries: QueryDataResourse;
	promQueries: IPromQueries;
	chQueries: IChQueries;
	queryType: EQueryType;
	panelType: GRAPH_TYPES;
}

export interface IChQueries {
	[key: string]: IChQuery;
}

export interface IChQuery extends IClickHouseQuery {
	query: string;
}

export interface IPromQuery extends IPromQLQuery {
	stats?: '';
}

export interface IPromQueries {
	[key: string]: IPromQuery;
}
