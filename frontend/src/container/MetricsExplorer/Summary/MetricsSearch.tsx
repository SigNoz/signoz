import { Tooltip } from 'antd';
import QuerySearch from 'components/QueryBuilderV2/QueryV2/QuerySearch/QuerySearch';
import RunQueryBtn from 'container/QueryBuilder/components/RunQueryBtn/RunQueryBtn';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import { Info } from 'lucide-react';
import { DataSource } from 'types/common/queryBuilder';

import { MetricsSearchProps } from './types';

function MetricsSearch({
	query,
	onChange,
	currentQueryFilterExpression,
	setCurrentQueryFilterExpression,
	isLoading,
}: MetricsSearchProps): JSX.Element {
	const handleOnChange = (expression: string): void => {
		setCurrentQueryFilterExpression(expression);
	};

	const handleStageAndRunQuery = (): void =>
		onChange(currentQueryFilterExpression);

	return (
		<div className="metrics-search-container">
			<div data-testid="qb-search-container" className="qb-search-container">
				<Tooltip
					title="Use filters to refine metrics based on attributes. Example: service_name=api - Shows all metrics associated with the API service"
					placement="right"
				>
					<Info size={16} />
				</Tooltip>
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
					onRun={handleOnChange}
					showFilterSuggestionsWithoutMetric
				/>
			</div>
			<RunQueryBtn onStageRunQuery={handleStageAndRunQuery} disabled={isLoading} />
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
