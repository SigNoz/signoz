import { useEffect, useState } from 'react';
import { Button, Tooltip } from 'antd';
import QuerySearch from 'components/QueryBuilderV2/QueryV2/QuerySearch/QuerySearch';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import { Info, Play } from 'lucide-react';
import { DataSource } from 'types/common/queryBuilder';

import { MetricsSearchProps } from './types';

function MetricsSearch({ query, onChange }: MetricsSearchProps): JSX.Element {
	const [currentExpression, setCurrentExpression] = useState<string>(
		query?.filter?.expression || '',
	);

	useEffect(() => {
		const expression = query?.filter?.expression || '';
		setCurrentExpression(expression);
	}, [query?.filter?.expression]);

	const handleOnChange = (expression: string): void => {
		setCurrentExpression(expression);
	};

	const handleStageAndRunQuery = (): void => onChange(currentExpression);

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
							expression: currentExpression,
						},
					}}
					onRun={handleOnChange}
					showFilterSuggestionsWithoutMetric
				/>
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
