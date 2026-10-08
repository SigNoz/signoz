import { ReactNode, useCallback } from 'react';
import cx from 'classnames';
import TanStackTable from 'components/TanStackTableView';
import APIError from 'types/api/error';

import {
	K8sEntityData,
	K8sEntityListConfig,
} from '../../Base/entity.config.types';
import { K8sEmptyState } from '../../Base/K8sEmptyState';
import {
	DrawerHistoryEntry,
	useDrawerHistoryStore,
} from '../../Base/useDrawerHistoryStore';
import {
	useInfraMonitoringFontSize,
	useInfraMonitoringLineClamp,
} from '../../Base/useInfraMonitoringTablePreferencesStore';
import { InfraMonitoringEntity, K8S_CATEGORY_LABELS } from '../../constants';
import {
	SelectedItemParams,
	useInfraMonitoringSelectedItemParams,
} from '../../hooks';
import { usePrimeEntityDetails } from '../../Base/usePrimeEntityDetails';
import { RELATED_ENTITIES_PAGE_SIZE } from './useRelatedEntities';

import listStyles from '../../Base/K8sBaseList.module.scss';
import styles from './EntityOverview.module.scss';

interface RelatedEntitiesTableProps {
	targetCategory: InfraMonitoringEntity;
	listConfig: K8sEntityListConfig<K8sEntityData, string | SelectedItemParams>;
	records: K8sEntityData[];
	total: number;
	isLoading: boolean;
	isError: boolean;
	error?: APIError | null;
	endTimeBeforeRetention?: boolean;
	onPageChange: (page: number) => void;
	onLimitChange: (limit: number) => void;
	/** Rendered in the card's header strip, above the rows it describes */
	header: ReactNode;
	/** The drawer's own resource, so a row click can leave a trail back to it */
	source: Omit<DrawerHistoryEntry, 'params'>;
}

export function RelatedEntitiesTable({
	targetCategory,
	listConfig,
	records,
	total,
	isLoading,
	isError,
	error,
	endTimeBeforeRetention,
	onPageChange,
	onLimitChange,
	header,
	source,
}: RelatedEntitiesTableProps): JSX.Element {
	const [selectedItemParams, setSelectedItemParams] =
		useInfraMonitoringSelectedItemParams();
	const pushDrawerHistory = useDrawerHistoryStore((store) => store.push);
	const primeDetails = usePrimeEntityDetails();
	const lineClamp = useInfraMonitoringLineClamp();
	const fontSize = useInfraMonitoringFontSize();

	// Opens the clicked resource in its own drawer, overview tab included
	const handleRowClick = useCallback(
		(record: K8sEntityData, itemKey: string | SelectedItemParams): void => {
			const params: SelectedItemParams =
				typeof itemKey === 'object'
					? itemKey
					: { selectedItem: itemKey, clusterName: null, namespaceName: null };

			pushDrawerHistory({ ...source, params: selectedItemParams });

			// The row already carries the record the drawer is about to fetch
			primeDetails({
				params,
				queryKeyPrefix: listConfig.detailsQueryKeyPrefix,
				entity: record,
			});
			setSelectedItemParams({ ...params, category: targetCategory });
		},
		[
			primeDetails,
			pushDrawerHistory,
			selectedItemParams,
			source,
			setSelectedItemParams,
			targetCategory,
			listConfig.detailsQueryKeyPrefix,
		],
	);

	const isEmpty = !isLoading && records.length === 0;

	return (
		<div className={styles.tableCard}>
			<div className={styles.tableHeader}>{header}</div>

			{isEmpty ? (
				<div className={styles.emptyState}>
					<K8sEmptyState
						isError={isError}
						error={error}
						isLoading={isLoading}
						endTimeBeforeRetention={endTimeBeforeRetention}
					/>
				</div>
			) : (
				<TanStackTable<K8sEntityData, string | SelectedItemParams>
					data={records}
					columns={listConfig.tableColumns}
					columnStorageKey={`k8s-overview-${targetCategory}-columns`}
					isLoading={isLoading}
					getRowKey={listConfig.getRowKey}
					getItemKey={listConfig.getItemKey}
					onRowClick={handleRowClick}
					className={cx(listStyles.k8SListTable, styles.table)}
					testId={`related-entities-table-${targetCategory}`}
					// A page of rows is short enough to render whole, which keeps the card
					// at the height of its rows instead of stretching down the drawer
					disableVirtualScroll
					pagination={{
						total,
						defaultLimit: RELATED_ENTITIES_PAGE_SIZE,
						showTotalCount: true,
						totalCountLabel: K8S_CATEGORY_LABELS[targetCategory],
						onPageChange,
						onLimitChange,
					}}
					plainTextCellLineClamp={lineClamp}
					cellTypographySize={fontSize}
					paginationClassname={listStyles.paginationContainer}
					resetScrollKey={targetCategory}
				/>
			)}
		</div>
	);
}
