import { Tooltip } from 'antd';
import QueryBuilderSearch from 'container/QueryBuilder/filters/QueryBuilderSearch';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import { HardHat, Info } from 'lucide-react';

import { MetricsSearchProps } from './types';

function MetricsSearch({ query, onChange }: MetricsSearchProps): JSX.Element {
	return (
		<div className="metrics-search-container">
			<div className="qb-search-container">
				<Tooltip
					title="Use filters to refine metrics based on attributes. Example: service_name=api - Shows all metrics associated with the API service"
					placement="right"
				>
					<Info size={16} />
				</Tooltip>
				<QueryBuilderSearch
					query={query}
					onChange={onChange}
					suffixIcon={<HardHat size={16} />}
					isMetricsExplorer
				/>
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
