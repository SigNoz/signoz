import QuerySearch from 'components/QueryBuilderV2/QueryV2/QuerySearch/QuerySearch';
import RunQueryBtn from 'container/QueryBuilder/components/RunQueryBtn/RunQueryBtn';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import { DataSource } from 'types/common/queryBuilder';

import { MetricsSearchProps } from './types';

function MetricsSearch({
	query,
	onChange,
	currentQueryFilterExpression,
	setCurrentQueryFilterExpression,
	isLoading,
	handleCancelQuery,
	onRunQuery,
}: MetricsSearchProps): JSX.Element {
	const handleOnChange = (expression: string): void => {
		setCurrentQueryFilterExpression(expression);
	};

	const handleStageAndRunQuery = (): void => {
		onChange(currentQueryFilterExpression);
		onRunQuery?.();
	};

	const handleRunQuery = (expression: string): void => {
		setCurrentQueryFilterExpression(expression);
		onChange(expression);
	};

	return (
		<div className="metrics-search-container">
			<div data-testid="qb-search-container" className="qb-search-container">
				<QuerySearch
					onChange={handleOnChange}
					dataSource={DataSource.METRICS}
					queryData={{
						...query,
						filter: {
							...query?.filter,
							expression: currentQueryFilterExpression,
						},
					}}
					onRun={handleRunQuery}
					showFilterSuggestionsWithoutMetric
					placeholder="Search your metrics. Try service.name='api' to see all API service metrics, or http.client for HTTP client metrics."
				/>
			</div>
			<RunQueryBtn
				onStageRunQuery={handleStageAndRunQuery}
				isLoadingQueries={isLoading}
				handleCancelQuery={handleCancelQuery}
			/>
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
