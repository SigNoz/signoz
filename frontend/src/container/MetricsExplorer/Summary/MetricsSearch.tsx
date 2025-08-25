import { Button, Tooltip } from 'antd';
import QuerySearch from 'components/QueryBuilderV2/QueryV2/QuerySearch/QuerySearch';
import { convertExpressionToFilters } from 'components/QueryBuilderV2/utils';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import { cloneDeep } from 'lodash-es';
import { Info, Play } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
	IBuilderQuery,
	TagFilter,
} from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import { MetricsSearchProps } from './types';

function MetricsSearch({ onChange, query }: MetricsSearchProps): JSX.Element {
	const [contextQuery, setContextQuery] = useState<IBuilderQuery | undefined>(
		query,
	);

	useEffect(() => {
		setContextQuery(query);
	}, [query]);

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

		onChange(newFilters);
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
	};

	const handleStageAndRunQuery = (): void =>
		handleRunQuery(contextQuery?.filter?.expression || '');
	return (
		<div className="metrics-search-container">
			<div data-testid="qb-search-container" className="qb-search-container">
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
			<Button
				type="primary"
				onClick={handleStageAndRunQuery}
				className="stage-run-query"
				icon={<Play size={14} />}
			>
				Stage & Run Query
			</Button>
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
