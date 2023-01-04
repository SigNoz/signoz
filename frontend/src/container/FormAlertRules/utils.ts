import { Time } from 'container/TopNav/DateTimeSelection/config';
import {
	IBuilderQueries,
	IChQueries,
	IChQuery,
	IFormulaQueries,
	IFormulaQuery,
	IMetricQueries,
	IMetricQuery,
	IPromQueries,
	IPromQuery,
} from 'types/api/alerts/compositeQuery';
import {
	IMetricsBuilderQuery,
	Query as IStagedQuery,
} from 'types/api/dashboard/getAll';
import { EQueryType } from 'types/common/dashboard';

export const toFormulaQueries = (b: IBuilderQueries): IFormulaQueries => {
	const f: IFormulaQueries = {};
	if (!b) return f;
	Object.keys(b).forEach((key) => {
		if (key === 'F1') {
			f[key] = b[key] as IFormulaQuery;
		}
	});

	return f;
};

export const toMetricQueries = (b: IBuilderQueries): IMetricQueries => {
	const m: IMetricQueries = {};
	if (!b) return m;
	Object.keys(b).forEach((key) => {
		if (key !== 'F1') {
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
	c: IChQueries,
): IStagedQuery => {
	const qbList: IMetricQuery[] = [];
	const formulaList: IFormulaQuery[] = [];
	const promList: IPromQuery[] = [];
	const chQueryList: IChQuery[] = [];

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
			promList.push({ ...p[key], name: key });
		});
	}
	// convert map[string]IChQuery to IChQuery[]
	if (c) {
		Object.keys(c).forEach((key) => {
			chQueryList.push({ ...c[key], name: key, rawQuery: c[key].query });
		});
	}

	return {
		queryType: t,
		promQL: promList,
		metricsBuilder: {
			formulas: formulaList,
			queryBuilder: qbList,
		},
		clickHouse: chQueryList,
	};
};

// toChartInterval converts eval window to chart selection time interval
export const toChartInterval = (evalWindow: string | undefined): Time => {
	switch (evalWindow) {
		case '5m0s':
			return '5min';
		case '10m0s':
			return '10min';
		case '15m0s':
			return '15min';
		case '30m0s':
			return '30min';
		case '60m0s':
			return '1hr';
		case '4h0m0s':
			return '4hr';
		case '24h0m0s':
			return '1day';
		default:
			return '5min';
	}
};
