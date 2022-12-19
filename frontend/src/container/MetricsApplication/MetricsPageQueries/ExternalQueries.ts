import {
	IMetricsBuilderFormula,
	IMetricsBuilderQuery,
	IQueryBuilderTagFilterItems,
} from 'types/api/dashboard/getAll';

import {
	getQueryBuilderQueries,
	getQueryBuilderQuerieswithAdditionalItems,
	getQueryBuilderQuerieswithFormula,
} from './MetricsPageQueriesFactory';

const groupBy = ['address'];

export const externalCallErrorPercent = ({
	servicename,
	legend,
	tagFilterItems,
}: ExternalCallDurationByAddressProps): {
	formulas: IMetricsBuilderFormula[];
	queryBuilder: IMetricsBuilderQuery[];
} => {
	const metricNameA = 'signoz_external_call_latency_count';
	const metricNameB = 'signoz_external_call_latency_count';
	const additionalItems = {
		id: '',
		key: 'status_code',
		op: 'IN',
		value: ['STATUS_CODE_ERROR'],
	};

	const legendFormula = 'External Call Error Percentage';
	const expression = 'A*100/B';
	const disabled = false;
	return getQueryBuilderQuerieswithAdditionalItems({
		metricNameA,
		metricNameB,
		additionalItems,
		servicename,
		legend,
		groupBy,
		disabled,
		tagFilterItems,
		expression,
		legendFormula,
	});
};

export const externalCallDuration = ({
	servicename,
	tagFilterItems,
}: ExternalCallProps): {
	formulas: IMetricsBuilderFormula[];
	queryBuilder: IMetricsBuilderQuery[];
} => {
	const metricNameA = 'signoz_external_call_latency_sum';
	const metricNameB = 'signoz_external_call_latency_count';
	const expression = 'A/B';
	const legendFormula = 'Average Duration';
	const legend = '';
	const disabled = true;

	return getQueryBuilderQuerieswithFormula({
		servicename,
		legend,
		disabled,
		tagFilterItems,
		metricNameA,
		metricNameB,
		expression,
		legendFormula,
	});
};

export const externalCallRpsByAddress = ({
	servicename,
	legend,
	tagFilterItems,
}: ExternalCallDurationByAddressProps): {
	formulas: IMetricsBuilderFormula[];
	queryBuilder: IMetricsBuilderQuery[];
} => {
	const metricName = 'signoz_external_call_latency_count';
	return getQueryBuilderQueries({
		servicename,
		legend,
		tagFilterItems,
		metricName,
		groupBy,
	});
};

export const externalCallDurationByAddress = ({
	servicename,
	legend,
	tagFilterItems,
}: ExternalCallDurationByAddressProps): {
	formulas: IMetricsBuilderFormula[];
	queryBuilder: IMetricsBuilderQuery[];
} => {
	const metricNameA = 'signoz_external_call_latency_sum';
	const metricNameB = 'signoz_external_call_latency_count';
	const expression = 'A/B';
	const legendFormula = legend;
	const disabled = false;
	return getQueryBuilderQuerieswithFormula({
		servicename,
		legend,
		disabled,
		tagFilterItems,
		metricNameA,
		metricNameB,
		expression,
		legendFormula,
		groupBy,
	});
};

interface ExternalCallDurationByAddressProps extends ExternalCallProps {
	legend: '{{address}}';
}

export interface ExternalCallProps {
	servicename: string | undefined;
	tagFilterItems: IQueryBuilderTagFilterItems[];
}
