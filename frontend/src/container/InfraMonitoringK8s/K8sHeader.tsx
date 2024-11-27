import './InfraMonitoringK8s.styles.scss';

import { Button, Input } from 'antd';
import QueryBuilderSearch from 'container/QueryBuilder/filters/QueryBuilderSearch';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { SlidersHorizontal } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

import K8sFiltersSidePanel from './K8sFiltersSidePanel/K8sFiltersSidePanel';

function HostsListControls({
	handleFiltersChange,
}: {
	handleFiltersChange: (value: IBuilderQuery['filters']) => void;
}): JSX.Element {
	const [isFiltersSidePanelOpen, setIsFiltersSidePanelOpen] = useState(false);

	const { currentQuery } = useQueryBuilder();
	const updatedCurrentQuery = useMemo(
		() => ({
			...currentQuery,
			builder: {
				...currentQuery.builder,
				queryData: [
					{
						...currentQuery.builder.queryData[0],
						aggregateOperator: 'noop',
						aggregateAttribute: {
							...currentQuery.builder.queryData[0].aggregateAttribute,
						},
					},
				],
			},
		}),
		[currentQuery],
	);
	const query = updatedCurrentQuery?.builder?.queryData[0] || null;

	const handleChangeTagFilters = useCallback(
		(value: IBuilderQuery['filters']) => {
			handleFiltersChange(value);
		},
		[handleFiltersChange],
	);

	return (
		<div className="k8s-list-controls">
			<div className="k8s-list-controls-left">
				<div className="k8s-qb-search-container">
					<QueryBuilderSearch
						query={query}
						onChange={handleChangeTagFilters}
						isInfraMonitoring
						disableNavigationShortcuts
					/>
				</div>

				<div className="k8s-attribute-search-container">
					<Input
						addonBefore={<div> Group by </div>}
						placeholder="Search for attribute"
					/>
				</div>
			</div>

			<div className="k8s-list-controls-right">
				<DateTimeSelectionV2
					showAutoRefresh={false}
					showRefreshText={false}
					hideShareModal
				/>

				<Button
					type="text"
					className="periscope-btn ghost"
					onClick={(): void => setIsFiltersSidePanelOpen(true)}
				>
					<SlidersHorizontal size={14} />
				</Button>
			</div>

			{isFiltersSidePanelOpen && (
				<K8sFiltersSidePanel
					addedColumns={[
						'HostName',
						'Status',
						'CPU Usage',
						'Memory Usage',
						'Load Avg',
					]}
					availableColumns={['HostName', 'Status', 'CPU', 'Memory']}
					onClose={(): void => {
						if (isFiltersSidePanelOpen) {
							setIsFiltersSidePanelOpen(false);
						}
					}}
				/>
			)}
		</div>
	);
}

export default HostsListControls;
