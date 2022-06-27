export interface CompositeMetricQuery {
	builderQueries: BuilderQueries;
	promQueries: PromQueries;
	queryType: number;
}

interface PromQueries {
	[key: string]: PromQuery;
}

export interface PromQuery {
	query: string;
	stats: string;
}

interface BuilderQueries {
	[key: string]: MetricQuery;
}

export interface MetricQuery {
	queryName: string;
	metricName: string;
	tagFilters: FilterSet;
	groupBy: string[];
	aggregateOperator: number;
	expression: string;
}
export interface FilterSet {
	op: string;
	items: FilterItem[];
}

export interface FilterItem {
	key: string;
	value: unknown;
	op: string;
}

