import { Select, Tooltip } from 'antd';
import QueryBuilderSearch from 'container/QueryBuilder/filters/QueryBuilderSearch';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import { HardHat } from 'lucide-react';

import { TREEMAP_VIEW_OPTIONS } from './constants';
import { MetricsSearchProps } from './types';

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
			<Tooltip
				title="Use filters to refine metrics based on attributes. Example: service_name='api' - Shows metrics created by API service"
				placement="bottom"
			>
				<div>
					<QueryBuilderSearch
						query={query}
						onChange={onChange}
						suffixIcon={<HardHat size={16} />}
						isMetricsExplorer
					/>
				</div>
			</Tooltip>
		</div>
	);
}

export default MetricsSearch;
