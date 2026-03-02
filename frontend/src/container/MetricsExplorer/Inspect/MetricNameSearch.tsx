import { useState } from 'react';
import { Typography } from 'antd';
import { initialQueriesMap } from 'constants/queryBuilder';
import { AggregatorFilter } from 'container/QueryBuilder/filters';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { DataSource } from 'types/common/queryBuilder';

import { MetricNameSearchProps } from './types';

function MetricNameSearch({
	currentMetricName,
	setCurrentMetricName,
}: MetricNameSearchProps): JSX.Element {
	const [searchText, setSearchText] = useState(currentMetricName);

	const handleSetMetricName = (value: BaseAutocompleteData): void => {
		setCurrentMetricName(value.key);
	};

	const handleChange = (value: BaseAutocompleteData): void => {
		setSearchText(value.key);
	};

	return (
		<div
			data-testid="metric-name-search"
			className="inspect-metrics-input-group metric-name-search"
		>
			<Typography.Text>From</Typography.Text>
			<AggregatorFilter
				defaultValue={searchText ?? ''}
				query={initialQueriesMap[DataSource.METRICS].builder.queryData[0]}
				onSelect={handleSetMetricName}
				onChange={handleChange}
			/>
		</div>
	);
}

export default MetricNameSearch;
