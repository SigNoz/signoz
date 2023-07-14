import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource, QueryBuilderData } from 'types/common/queryBuilder';

import { DataType } from '../constant';
import {
	getQueryBuilderQueries,
	getQueryBuilderQuerieswithFormula,
} from './MetricsPageQueriesFactory';

export const databaseCallsRPS = ({
	servicename,
	legend,
	tagFilterItems,
}: DatabaseCallsRPSProps): QueryBuilderData => {
	const metricNames: BaseAutocompleteData[] = [
		{
			key: 'signoz_db_latency_count',
			dataType: DataType.FLOAT64,
			isColumn: true,
			type: null,
		},
	];
	const groupBy: BaseAutocompleteData[] = [
		{ dataType: DataType.STRING, isColumn: false, key: 'db_system', type: 'tag' },
	];
	const filterItems: TagFilterItem[][] = [
		[
			{
				id: '',
				key: {
					key: 'service_name',
					dataType: DataType.STRING,
					isColumn: false,
					type: 'resource',
				},
				op: 'IN',
				value: [`${servicename}`],
			},
			...tagFilterItems,
		],
	];

	const legends = [legend];

	return getQueryBuilderQueries({
		metricNames,
		groupBy,
		legends,
		filterItems,
		dataSource: DataSource.METRICS,
	});
};

export const databaseCallsAvgDuration = ({
	servicename,
	tagFilterItems,
}: DatabaseCallProps): QueryBuilderData => {
	const metricNameA: BaseAutocompleteData = {
		key: 'signoz_db_latency_sum',
		dataType: DataType.FLOAT64,
		isColumn: true,
		type: null,
	};
	const metricNameB: BaseAutocompleteData = {
		key: 'signoz_db_latency_count',
		dataType: DataType.FLOAT64,
		isColumn: true,
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
				key: 'service_name',
				dataType: DataType.STRING,
				isColumn: false,
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
