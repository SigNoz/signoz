import { useCallback } from 'react';
import { Button } from '@signozhq/ui/button';
import { Select } from 'antd';
import { Download, SlidersVertical } from '@signozhq/icons';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import logEvent from 'api/common/logEvent';
import { InfraMonitoringEvents } from 'constants/events';

import { InfraMonitoringEntity } from '../constants';
import {
	useInfraMonitoringGroupBy,
	useInfraMonitoringPageListing,
} from '../hooks';
import { useInfraMonitoringGroupByData } from './useInfraMonitoringGroupByData';

import styles from './K8sTableToolbar.module.scss';

interface K8sTableToolbarProps {
	entity: InfraMonitoringEntity;
	leftFilters?: React.ReactNode;
	onOpenOptionsDrawer: () => void;
	onDownload?: () => void;
}

function K8sTableToolbar({
	entity,
	leftFilters,
	onOpenOptionsDrawer,
	onDownload,
}: K8sTableToolbarProps): JSX.Element {
	const { groupByOptions, isLoading: isLoadingGroupByFilters } =
		useInfraMonitoringGroupByData(entity);

	const [groupBy, setGroupBy] = useInfraMonitoringGroupBy();
	const [, setCurrentPage] = useInfraMonitoringPageListing();

	const handleGroupByChange = useCallback(
		(value: string[]) => {
			void setCurrentPage(1);
			void setGroupBy(value);

			void logEvent(InfraMonitoringEvents.GroupByChanged, {
				entity: InfraMonitoringEvents.K8sEntity,
				page: InfraMonitoringEvents.ListPage,
				category: InfraMonitoringEvents.Pod,
			});
		},
		[setCurrentPage, setGroupBy],
	);

	return (
		<div className={styles.toolbar}>
			<div className={styles.groupByContainer}>
				<div className={styles.groupByLabel}>Group by</div>
				<Select
					className={styles.groupBySelect}
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
