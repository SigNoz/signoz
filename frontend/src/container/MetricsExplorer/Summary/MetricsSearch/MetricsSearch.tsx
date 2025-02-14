import { Select } from 'antd';
import QueryBuilderSearchV2 from 'container/QueryBuilder/filters/QueryBuilderSearchV2/QueryBuilderSearchV2';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import { HardHat } from 'lucide-react';

import { TREEMAP_VIEW_OPTIONS } from '../constants';
import { MetricsSearchProps } from '../types';

function MetricsSearch({
	query,
	onChange,
	heatmapView,
	setHeatmapView,
}: MetricsSearchProps): JSX.Element {
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
			<QueryBuilderSearchV2
				query={query}
				onChange={onChange}
				suffixIcon={<HardHat size={16} />}
			/>
		</div>
	);
}

export default MetricsSearch;
