import { useCallback } from 'react';
import { Button } from '@signozhq/ui/button';
import { Select } from 'antd';
import { Download, SlidersVertical } from '@signozhq/icons';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import logEvent from 'api/common/logEvent';
import { InfraMonitoringEvents } from 'constants/events';

import {
	INFRA_MONITORING_ATTR_KEYS,
	InfraMonitoringEntity,
} from '../constants';
import {
	useInfraMonitoringGroupBy,
	useInfraMonitoringOrderBy,
	useInfraMonitoringPageListing,
} from '../hooks';
import { useInfraMonitoringGroupByData } from './useInfraMonitoringGroupByData';

import styles from './K8sTableToolbar.module.scss';
import { logInfraGroupByCustomizedEvent } from 'container/InfraMonitoringK8sV2/Base/events';

const NAME_COLUMN_KEYS: Set<string> = new Set([
	INFRA_MONITORING_ATTR_KEYS.HOST_NAME,
	INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME,
	INFRA_MONITORING_ATTR_KEYS.K8S_DAEMONSET_NAME,
	INFRA_MONITORING_ATTR_KEYS.K8S_DEPLOYMENT_NAME,
	INFRA_MONITORING_ATTR_KEYS.K8S_JOB_NAME,
	INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
	INFRA_MONITORING_ATTR_KEYS.K8S_NODE_NAME,
	INFRA_MONITORING_ATTR_KEYS.K8S_POD_NAME,
	INFRA_MONITORING_ATTR_KEYS.K8S_STATEFULSET_NAME,
	INFRA_MONITORING_ATTR_KEYS.K8S_PERSISTENT_VOLUME_CLAIM_NAME,
]);

interface K8sTableToolbarProps {
	entity: InfraMonitoringEntity;
	eventCategory: InfraMonitoringEvents;
	leftFilters?: React.ReactNode;
	onOpenOptionsDrawer: () => void;
	onDownload?: () => void;
}

function K8sTableToolbar({
	entity,
	eventCategory,
	leftFilters,
	onOpenOptionsDrawer,
	onDownload,
}: K8sTableToolbarProps): JSX.Element {
	const { groupByOptions, isLoading: isLoadingGroupByFilters } =
		useInfraMonitoringGroupByData(entity);

	const [groupBy, setGroupBy] = useInfraMonitoringGroupBy();
	const [orderBy, setOrderBy] = useInfraMonitoringOrderBy();
	const [, setCurrentPage] = useInfraMonitoringPageListing();

	const handleGroupByChange = useCallback(
		(value: string[]) => {
			void setCurrentPage(1);

			if (orderBy && NAME_COLUMN_KEYS.has(orderBy.columnName)) {
				void setOrderBy(null);
			}

			void setGroupBy(value);

			void logEvent(InfraMonitoringEvents.GroupByChanged, {
				entity: InfraMonitoringEvents.K8sEntity,
				page: InfraMonitoringEvents.ListPage,
				category: eventCategory,
			});

			logInfraGroupByCustomizedEvent(entity, value);
		},
		[entity, eventCategory, orderBy, setCurrentPage, setOrderBy, setGroupBy],
	);

	return (
		<div className={styles.toolbar}>
			<div className={styles.groupByContainer} data-testid="k8s-table-group-by">
				<div className={styles.groupByLabel}>Group by</div>
				<Select
					className={styles.groupBySelect}
					data-testid="k8s-table-group-by-select"
					loading={isLoadingGroupByFilters}
					mode="multiple"
					value={groupBy}
					allowClear
					maxTagCount="responsive"
					placeholder="Search for attribute"
					options={groupByOptions}
					onChange={handleGroupByChange}
				/>
			</div>

			<div className={styles.spacer} />

			{leftFilters}

			{onDownload && (
				<TooltipSimple title="Download">
					<Button
						type="button"
						variant="ghost"
						size="icon"
						color="secondary"
						data-testid="k8s-table-download-button"
						onClick={onDownload}
						className={styles.toolbarButton}
					>
						<Download size={14} />
					</Button>
				</TooltipSimple>
			)}

			<TooltipSimple title="Options">
				<Button
					type="button"
					variant="ghost"
					size="icon"
					color="secondary"
					data-testid="k8s-table-options-button"
					onClick={onOpenOptionsDrawer}
					className={styles.toolbarButton}
				>
					<SlidersVertical size={14} />
				</Button>
			</TooltipSimple>
		</div>
	);
}

export default K8sTableToolbar;
