export interface CompositeMetricQuery {
	builderQueries: BuilderQueries;
	promQueries: PromQueries;
	queryType: number;
}

export interface PromQueries {
	[key: string]: PromQuery;
}

export interface PromQuery {
	query: string;
	stats: string;
}

export interface BuilderQueries {
	[key: string]: MetricQuery;
}

export interface MetricQuery {
	queryName: string;
	metricName?: string;
	tagFilters?: FilterSet;
	groupBy?: string[];
	reduceTo?: string[];
	aggregateOperator?: number | undefined;
	expression?: string;
	formulaOnly?: boolean;

	disabled?: boolean;
	toggleDisable?: boolean;
	toggleDelete?: boolean;
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

