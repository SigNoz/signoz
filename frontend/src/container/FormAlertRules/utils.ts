import {
	IBuilderQueries,
	IFormulaQueries,
	IMetricQueries,
	IMetricQuery,
} from 'types/api/alerts/compositeQuery';
import { IMetricsBuilderQuery } from 'types/api/dashboard/getAll';

export const toFormulaQueries = (b: IBuilderQueries): IFormulaQueries => {
	const f: IFormulaQueries = {};
	Object.keys(b).forEach((key) => {
		if (!b[key].metricName || b[key].metricName === '') {
			f[key] = b[key];
		}
	});

	return f;
};

export const toMetricQueries = (b: IBuilderQueries): IMetricQueries => {
	const m: IMetricQueries = {};
	Object.keys(b).forEach((key) => {
		if (b[key].metricName !== '') {
			m[key] = b[key];
		}
	});

	return m;
}

export const prepareBuilderQueries = (
	m: IMetricQueries,
	f: IFormulaQueries,
): IBuilderQueries => {
	const b: IBuilderQueries = {
		...m,
	};

	Object.keys(f).forEach((key) => {
		b[key] = {
			...f[key],
			aggregateOperator: undefined,
			metricName: '',
		};
	});
	return b;
};

export const toIMetricsBuilderQuery = (
	q: IMetricQuery,
): IMetricsBuilderQuery => {
	return {
		name: q.name,
		metricName: q.metricName,
		tagFilters: q.tagFilters,
		groupBy: q.groupBy,
		aggregateOperator: q.aggregateOperator,
		disabled: q.disabled,
		legend: q.legend,
	};
}
