import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { QueryBuilderData } from 'types/common/queryBuilder';

import {
	getQueryBuilderQueries,
	getQueryBuilderQuerieswithFormula,
} from './MetricsPageQueriesFactory';

const groupBy: BaseAutocompleteData[] = [
	{ dataType: 'string', isColumn: false, key: 'address', type: 'tag' },
];

export const externalCallErrorPercent = ({
	servicename,
	legend,
	tagFilterItems,
}: ExternalCallDurationByAddressProps): QueryBuilderData => {
	const metricNameA: BaseAutocompleteData = {
		dataType: 'float64',
		isColumn: true,
		key: 'signoz_external_call_latency_count',
		type: null,
	};
	const metricNameB: BaseAutocompleteData = {
		dataType: 'float64',
		isColumn: true,
		key: 'signoz_external_call_latency_count',
		type: null,
	};
	const additionalItemsA: TagFilterItem[] = [
		{
			id: '',
			key: {
				dataType: 'string',
				isColumn: false,
				key: 'service_name',
				type: 'resource',
			},
			op: 'IN',
			value: [`${servicename}`],
		},
		{
			id: '',
			key: {
				dataType: 'int64',
				isColumn: false,
				key: 'status_code',
				type: 'tag',
			},
			op: 'IN',
			value: ['STATUS_CODE_ERROR'],
		},
		...tagFilterItems,
	];
	const additionalItemsB: TagFilterItem[] = [
		{
			id: '',
			key: {
				dataType: 'string',
				isColumn: false,
				key: 'service_name',
				type: 'resource',
			},
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
}: ExternalCallProps): QueryBuilderData => {
	const metricNameA: BaseAutocompleteData = {
		dataType: 'float64',
		isColumn: true,
		key: 'signoz_external_call_latency_sum',
		type: null,
	};
	const metricNameB: BaseAutocompleteData = {
		dataType: 'float64',
		isColumn: true,
		key: 'signoz_external_call_latency_count',
		type: null,
	};
	const expression = 'A/B';
	const legendFormula = 'Average Duration';
	const legend = '';
	const disabled = true;
	const additionalItemsA: TagFilterItem[] = [
		{
			id: '',
			key: {
				dataType: 'string',
				isColumn: false,
				key: 'service_name',
				type: 'resource',
			},
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
}: ExternalCallDurationByAddressProps): QueryBuilderData => {
	const metricName: BaseAutocompleteData = {
		dataType: 'float64',
		isColumn: true,
		key: 'signoz_external_call_latency_count',
		type: null,
	};
	const itemsA: TagFilterItem[] = [
		{
			id: '',
			key: {
				dataType: 'string',
				isColumn: false,
				key: 'service_name',
				type: 'resource',
			},
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
}: ExternalCallDurationByAddressProps): QueryBuilderData => {
	const metricNameA: BaseAutocompleteData = {
		dataType: 'float64',
		isColumn: true,
		key: 'signoz_external_call_latency_sum',
		type: null,
	};
	const metricNameB: BaseAutocompleteData = {
		dataType: 'float64',
		isColumn: true,
		key: 'signoz_external_call_latency_count',
		type: null,
	};
	const expression = 'A/B';
	const legendFormula = legend;
	const disabled = true;
	const additionalItemsA: TagFilterItem[] = [
		{
			id: '',
			key: {
				dataType: 'string',
				isColumn: false,
				key: 'service_name',
				type: 'resource',
			},
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
	tagFilterItems: TagFilterItem[];
}
