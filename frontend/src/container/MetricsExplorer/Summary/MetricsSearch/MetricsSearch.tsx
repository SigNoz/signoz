import { Select } from 'antd';
import { OPERATORS } from 'constants/queryBuilder';
import QueryBuilderSearch from 'container/QueryBuilder/filters/QueryBuilderSearch';
import { QueryBuilderProps } from 'container/QueryBuilder/QueryBuilder.interfaces';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import { HardHat } from 'lucide-react';
import { useMemo } from 'react';

import { TREEMAP_VIEW_OPTIONS } from '../constants';
import { MetricsSearchProps } from '../types';

function MetricsSearch({
	query,
	onChange,
	heatmapView,
	setHeatmapView,
}: MetricsSearchProps): JSX.Element {
	const filterConfigs: QueryBuilderProps['filterConfigs'] = useMemo(() => {
		const config: QueryBuilderProps['filterConfigs'] = {
			stepInterval: { isHidden: false, isDisabled: false },
			having: { isHidden: false, isDisabled: true },
			filters: {
				customKey: 'body',
				customOp: OPERATORS.CONTAINS,
			},
		};

		return config;
	}, []);

	return (
		<div className="metrics-search-container">
			<div className="metrics-search-options">
				<Select
					style={{ width: 140 }}
					options={TREEMAP_VIEW_OPTIONS}
					value={heatmapView}
					onChange={setHeatmapView}
				/>
				<DateTimeSelectionV2
					showAutoRefresh={false}
					showRefreshText={false}
					hideShareModal
				/>
			</div>
			<QueryBuilderSearch
				query={query}
				onChange={onChange}
				suffixIcon={<HardHat size={16} />}
				isMetricsExplorer
				whereClauseConfig={filterConfigs?.filters}
			/>
		</div>
	);
}

export default MetricsSearch;
