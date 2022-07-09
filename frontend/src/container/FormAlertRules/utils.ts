import {
	IBuilderQueries, 
	IFormulaQueries,
	IFormulaQuery,
	IMetricQueries,
	IMetricQuery,
	IPromQueries,
	IPromQuery,
} from 'types/api/alerts/compositeQuery';
import { IMetricsBuilderFormula, IMetricsBuilderQuery, IPromQLQuery } from 'types/api/dashboard/getAll';
import { EQueryType } from 'types/common/dashboard';
import { Query as IStagedQuery } from 'types/api/dashboard/getAll';

export const toFormulaQueries = (b: IBuilderQueries): IFormulaQueries => {
	const f: IFormulaQueries = {};
	if (!b) return f;
	Object.keys(b).forEach((key) => {
		if (!b[key].metricName || b[key].metricName === '') {
			f[key] = b[key] as IFormulaQuery;
		}
	});

	return f;
};

export const toMetricQueries = (b: IBuilderQueries): IMetricQueries => {
	const m: IMetricQueries = {};
	if (!b) return m;
	Object.keys(b).forEach((key) => {
		if (b[key].metricName !== '') {
			m[key] = b[key] as IMetricQuery;
		}
	});

	return m;
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
};


export const prepareBuilderQueries = (
	m: IMetricQueries,
	f: IFormulaQueries,
): IBuilderQueries => {
	if (!m) return {};
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

export const prepareStagedQuery = (
	t: EQueryType,
	m: IMetricQueries,
	f: IFormulaQueries,
	p: IPromQueries,
): IStagedQuery => {
	const qbList: IMetricQuery[] = [];
	const formulaList: IFormulaQuery[] = [];
	const promList: IPromQuery[] = [];

	// convert map[string]IMetricQuery to IMetricQuery[]
	if (m) {
		Object.keys(m).forEach((key) => {
			qbList.push(m[key]);
		});
	}

	// convert map[string]IFormulaQuery to IFormulaQuery[]
	if (f) {
		Object.keys(f).forEach((key) => {
			formulaList.push(f[key]);
		});
	}

	// convert map[string]IPromQuery to IPromQuery[]
	if (p) {
		Object.keys(p).forEach((key) => {
			promList.push(p[key]);
		});
	}
	return {
		queryType: t,
		promQL: promList,
		metricsBuilder: {
			formulas: formulaList,
			queryBuilder: qbList,
		},
		clickHouse: [],
	};
};
