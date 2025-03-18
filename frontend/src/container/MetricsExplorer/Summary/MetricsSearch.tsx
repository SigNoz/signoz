import { Select, Tooltip, Typography } from 'antd';
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
			<div className="metrics-search-wrapper">
				<div
					className="metrics-search-label"
					style={{ marginBottom: '12px', fontSize: '16px' }}
				>
					<Typography.Title level={4} className="metrics-table-title">
						Search
						<Tooltip
							title="Use filters to refine metrics based on attributes. Example: service_name=api - Shows all metrics associated with the API service"
							placement="right"
						>
							<span style={{ marginLeft: '4px' }}>
								<svg
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
								>
									<path
										fillRule="evenodd"
										clipRule="evenodd"
										d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22ZM12 9C11.4477 9 11 9.44772 11 10V16C11 16.5523 11.4477 17 12 17C12.5523 17 13 16.5523 13 16V10C13 9.44772 12.5523 9 12 9ZM12 8C12.5523 8 13 7.55228 13 7C13 6.44772 12.5523 6 12 6C11.4477 6 11 6.44772 11 7C11 7.55228 11.4477 8 12 8Z"
										fill="currentColor"
									/>
								</svg>
							</span>
						</Tooltip>
					</Typography.Title>
				</div>
				<div>
					<QueryBuilderSearch
						query={query}
						onChange={onChange}
						suffixIcon={<HardHat size={16} />}
						isMetricsExplorer
					/>
				</div>
			</div>
		</div>
	);
}

export default MetricsSearch;
