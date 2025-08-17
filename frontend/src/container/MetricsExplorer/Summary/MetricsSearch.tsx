import { Tooltip } from 'antd';
import QuerySearch from 'components/QueryBuilderV2/QueryV2/QuerySearch/QuerySearch';
import { convertExpressionToFilters } from 'components/QueryBuilderV2/utils';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import { cloneDeep } from 'lodash-es';
import { Info } from 'lucide-react';
import { useState } from 'react';
import {
	IBuilderQuery,
	TagFilter,
} from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import { MetricsSearchProps } from './types';
import { areAllFiltersComplete } from './utils';

function MetricsSearch({ onChange, query }: MetricsSearchProps): JSX.Element {
	const [contextQuery, setContextQuery] = useState<IBuilderQuery | undefined>(
		query,
	);

	const handleRunQuery = (expression: string): void => {
		let updatedContextQuery = cloneDeep(contextQuery);
		if (!updatedContextQuery) {
			return;
		}

		const newFilters: TagFilter = {
			items: expression ? convertExpressionToFilters(expression) : [],
			op: 'AND',
		};
		updatedContextQuery = {
			...updatedContextQuery,
			filter: {
				...updatedContextQuery.filter,
				expression,
			},
			filters: {
				...updatedContextQuery.filters,
				...newFilters,
				op: updatedContextQuery.filters?.op ?? 'AND',
			},
		};
		setContextQuery(updatedContextQuery);

		if (newFilters) {
			onChange(newFilters);
		}
	};

	const handleOnChange = (expression: string): void => {
		let updatedContextQuery = cloneDeep(contextQuery);
		if (updatedContextQuery) {
			updatedContextQuery = {
				...updatedContextQuery,
				filter: {
					...updatedContextQuery.filter,
					expression,
				},
			};
			setContextQuery(updatedContextQuery);
		}

		const newFilters: TagFilter = {
			items: expression ? convertExpressionToFilters(expression) : [],
			op: 'AND',
		};
		// If all filters are complete, run the query
		if (areAllFiltersComplete(newFilters)) {
			onChange(newFilters);
		}
	};

	return (
		<div className="metrics-search-container">
			<div className="qb-search-container">
				<Tooltip
					title="Use filters to refine metrics based on attributes. Example: service_name=api - Shows all metrics associated with the API service"
					placement="right"
				>
					<Info size={16} />
				</Tooltip>
				{contextQuery && (
					<QuerySearch
						onChange={handleOnChange}
						dataSource={DataSource.METRICS}
						queryData={contextQuery}
						onRun={handleRunQuery}
						isMetricsExplorer
					/>
				)}
			</div>
			<div className="metrics-search-options">
				<DateTimeSelectionV2
					showAutoRefresh={false}
					showRefreshText={false}
					hideShareModal
				/>
			</div>
		</div>
	);
}

export default MetricsSearch;
