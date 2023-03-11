import {
	IMetricsBuilderFormula,
	IMetricsBuilderQuery,
	IQueryBuilderTagFilterItems,
} from 'types/api/dashboard/getAll';

import {
	getQueryBuilderQueries,
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
	const additionalItemsA = [
		{
			id: '',
			key: 'service_name',
			op: 'IN',
			value: [`${servicename}`],
		},
		{
			id: '',
			key: 'status_code',
			op: 'IN',
			value: ['STATUS_CODE_ERROR'],
		},
		...tagFilterItems,
	];
	const additionalItemsB = [
		{
			id: '',
			key: 'service_name',
			op: 'IN',
			value: [`${servicename}`],
		},
		...tagFilterItems,
	];
	const legendFormula = legend;
	const expression = 'A*100/B';
	const disabled = true;
	return getQueryBuilderQuerieswithFormula({
		metricNameA,
		metricNameB,
		additionalItemsA,
		additionalItemsB,
		legend,
		groupBy,
		disabled,
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
	const additionalItemsA = [
		{
			id: '',
			key: 'service_name',
			op: 'IN',
			value: [`${servicename}`],
		},
		...tagFilterItems,
	];
	const additionalItemsB = additionalItemsA;

	return getQueryBuilderQuerieswithFormula({
		metricNameA,
		metricNameB,
		additionalItemsA,
		additionalItemsB,
		legend,
		disabled,
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
	const itemsA = [
		{
			id: '',
			key: 'service_name',
			op: 'IN',
			value: [`${servicename}`],
		},
		...tagFilterItems,
	];
	return getQueryBuilderQueries({
		metricName,
		groupBy,
		legend,
		itemsA,
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
	const disabled = true;
	const additionalItemsA = [
		{
			id: '',
			key: 'service_name',
			op: 'IN',
			value: [`${servicename}`],
		},
		...tagFilterItems,
	];
	const additionalItemsB = additionalItemsA;

	return getQueryBuilderQuerieswithFormula({
		metricNameA,
		metricNameB,
		additionalItemsA,
		additionalItemsB,
		legend,
		groupBy,
		disabled,
		expression,
		legendFormula,
	});
};

interface ExternalCallDurationByAddressProps extends ExternalCallProps {
	legend: string;
}

export interface ExternalCallProps {
	servicename: string | undefined;
	tagFilterItems: IQueryBuilderTagFilterItems[];
}
