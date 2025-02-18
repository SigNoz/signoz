import './InfraMonitoring.styles.scss';

import { initialQueriesMap } from 'constants/queryBuilder';
import { K8sCategory } from 'container/InfraMonitoringK8s/constants';
import QueryBuilderSearch from 'container/QueryBuilder/filters/QueryBuilderSearch';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import { useCallback, useMemo } from 'react';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

function HostsListControls({
	handleFiltersChange,
}: {
	handleFiltersChange: (value: IBuilderQuery['filters']) => void;
}): JSX.Element {
	const currentQuery = initialQueriesMap[DataSource.METRICS];
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
		<div className="hosts-list-controls">
			<div className="hosts-list-controls-left">
				<QueryBuilderSearch
					query={query}
					onChange={handleChangeTagFilters}
					isInfraMonitoring
					disableNavigationShortcuts
					entity={K8sCategory.HOSTS}
				/>
			</div>

			<div className="time-selector">
				<DateTimeSelectionV2
					showAutoRefresh={false}
					showRefreshText={false}
					hideShareModal
				/>
			</div>
		</div>
	);
}

export default HostsListControls;
