import { useCallback, useEffect, useState } from 'react';
import TanStackTable from 'components/TanStackTableView';

import {
	K8sEntityData,
	K8sEntityListConfig,
} from '../../Base/entity.config.types';
import { K8sEmptyState } from '../../Base/K8sEmptyState';
import { InfraMonitoringEntity } from '../../constants';
import {
	SelectedItemParams,
	useInfraMonitoringSelectedItemParams,
} from '../../hooks';
import { useRelatedEntities } from './useRelatedEntities';

import styles from './EntityOverview.module.scss';

const DEFAULT_PAGE_SIZE = 10;

interface RelatedEntitiesTableProps {
	targetCategory: InfraMonitoringEntity;
	listConfig: K8sEntityListConfig<K8sEntityData, string | SelectedItemParams>;
	expression: string;
	/** Time range in seconds — see useEntityDetailsTime */
	timeRange: { startTime: number; endTime: number };
}

export function RelatedEntitiesTable({
	targetCategory,
	listConfig,
	expression,
	timeRange,
}: RelatedEntitiesTableProps): JSX.Element {
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
	const [, setSelectedItemParams] = useInfraMonitoringSelectedItemParams();

	useEffect(() => {
		setPage(1);
	}, [expression]);

	const { records, total, isLoading, isError, error, endTimeBeforeRetention } =
		useRelatedEntities({
			fetchListData: listConfig.fetchListData,
			queryKey: `${targetCategory}RelatedEntities`,
			expression,
			timeRange,
			page,
			limit,
		});

	// Opens the clicked resource in its own drawer, overview tab included
	const handleRowClick = useCallback(
		(_record: K8sEntityData, itemKey: string | SelectedItemParams): void => {
			const params: SelectedItemParams =
				typeof itemKey === 'object'
					? itemKey
					: { selectedItem: itemKey, clusterName: null, namespaceName: null };

			setSelectedItemParams({ ...params, category: targetCategory });
		},
		[setSelectedItemParams, targetCategory],
	);

	if (!isLoading && records.length === 0) {
		return (
			<div className={styles.emptyState}>
				<K8sEmptyState
					isError={isError}
					error={error}
					isLoading={isLoading}
					endTimeBeforeRetention={endTimeBeforeRetention}
				/>
			</div>
		);
	}

	return (
		<TanStackTable<K8sEntityData, string | SelectedItemParams>
			data={records}
			columns={listConfig.tableColumns}
			columnStorageKey={`k8s-overview-${targetCategory}-columns`}
			isLoading={isLoading}
			getRowKey={listConfig.getRowKey}
			getItemKey={listConfig.getItemKey}
			onRowClick={handleRowClick}
			className={styles.table}
			testId={`related-entities-table-${targetCategory}`}
			pagination={{
				total,
				defaultLimit: DEFAULT_PAGE_SIZE,
				showTotalCount: true,
				totalCountLabel:
					targetCategory.charAt(0).toUpperCase() + targetCategory.slice(1),
				onPageChange: setPage,
				onLimitChange: setLimit,
			}}
			resetScrollKey={targetCategory}
		/>
	);
}
