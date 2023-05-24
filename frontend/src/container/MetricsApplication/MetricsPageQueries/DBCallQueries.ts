import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { QueryBuilderData } from 'types/common/queryBuilder';

import {
	getQueryBuilderQueries,
	getQueryBuilderQuerieswithFormula,
} from './MetricsPageQueriesFactory';

export const databaseCallsRPS = ({
	servicename,
	legend,
	tagFilterItems,
}: DatabaseCallsRPSProps): QueryBuilderData => {
	const metricName: BaseAutocompleteData = {
		dataType: 'float64',
		isColumn: true,
		key: 'signoz_db_latency_count',
		type: null,
	};
	const groupBy: BaseAutocompleteData[] = [
		{ dataType: 'string', isColumn: false, key: 'db_system', type: 'tag' },
	];
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

export const databaseCallsAvgDuration = ({
	servicename,
	tagFilterItems,
}: DatabaseCallProps): QueryBuilderData => {
	const metricNameA: BaseAutocompleteData = {
		dataType: 'float64',
		isColumn: true,
		key: 'signoz_db_latency_sum',
		type: null,
	};
	const metricNameB: BaseAutocompleteData = {
		dataType: 'float64',
		isColumn: true,
		key: 'signoz_db_latency_count',
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

interface DatabaseCallsRPSProps extends DatabaseCallProps {
	legend: '{{db_system}}';
}

interface DatabaseCallProps {
	servicename: string | undefined;
	tagFilterItems: TagFilterItem[];
}
