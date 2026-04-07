import { useCallback, useMemo, useState } from 'react';
import { VerticalAlignTopOutlined } from '@ant-design/icons';
import { Button, Tooltip, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import QuickFilters from 'components/QuickFilters/QuickFilters';
import { QuickFiltersSource } from 'components/QuickFilters/types';
import { InfraMonitoringEvents } from 'constants/events';
import { FeatureKeys } from 'constants/features';
import K8sBaseDetails from 'container/InfraMonitoringK8s/Base/K8sBaseDetails';
import { K8sBaseList } from 'container/InfraMonitoringK8s/Base/K8sBaseList';
import { K8sBaseFilters } from 'container/InfraMonitoringK8s/Base/types';
import { InfraMonitoringEntity } from 'container/InfraMonitoringK8s/constants';
import { useInfraMonitoringCurrentPage } from 'container/InfraMonitoringK8s/hooks';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryBuilderOperations';
import { Filter } from 'lucide-react';
import { useAppContext } from 'providers/App/App';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import {
	fetchHostEntityData,
	fetchHostListData,
	getHostMetricsQueryPayload,
	hostDetailsMetadataConfig,
	hostGetEntityName,
	hostGetSelectedItemFilters,
	hostInitialEventsFilter,
	hostInitialLogTracesFilter,
	hostRenderEmptyState,
	hostWidgetInfo,
} from './constants';
import {
	hostColumns,
	hostColumnsConfig,
	hostRenderRowData,
} from './table.config';
import { getHostsQuickFiltersConfig } from './utils';

import styles from './InfraMonitoringHosts.module.scss';

function Hosts(): JSX.Element {
	const [showFilters, setShowFilters] = useState(true);
	const [, setCurrentPage] = useInfraMonitoringCurrentPage();

	const { featureFlags } = useAppContext();
	const dotMetricsEnabled =
		featureFlags?.find((flag) => flag.name === FeatureKeys.DOT_METRICS_ENABLED)
			?.active || false;

	const { currentQuery } = useQueryBuilder();
	const { handleChangeQueryData } = useQueryOperations({
		index: 0,
		query: currentQuery.builder.queryData[0],
		entityVersion: '',
	});

	const handleFilterVisibilityChange = (): void => {
		setShowFilters(!showFilters);
	};

	const handleQuickFiltersChange = (query: Query): void => {
		handleChangeQueryData('filters', query.builder.queryData[0].filters);
		setCurrentPage(1);
		logEvent(InfraMonitoringEvents.FilterApplied, {
			entity: InfraMonitoringEvents.HostEntity,
			page: InfraMonitoringEvents.ListPage,
		});
	};

	const fetchListData = useCallback(
		async (filters: K8sBaseFilters, signal?: AbortSignal) => {
			filters.orderBy ||= {
				columnName: 'cpu',
				order: 'desc',
			};

			return fetchHostListData(filters, signal);
		},
		[],
	);

	const fetchEntityData = useCallback(
		async (
			filters: Parameters<typeof fetchHostEntityData>[0],
			signal?: AbortSignal,
		) => fetchHostEntityData(filters, signal),
		[],
	);

	const getSelectedItemFilters = useCallback(
		(selectedItem: string) =>
			hostGetSelectedItemFilters(selectedItem, dotMetricsEnabled),
		[dotMetricsEnabled],
	);

	const getInitialLogTracesFilters = useCallback(
		(host: import('api/infraMonitoring/getHostLists').HostData) =>
			hostInitialLogTracesFilter(host, dotMetricsEnabled),
		[dotMetricsEnabled],
	);

	const primaryFilterKeys = useMemo(
		() => [dotMetricsEnabled ? 'host.name' : 'host_name'],
		[dotMetricsEnabled],
	);

	const controlListPrefix = !showFilters ? (
		<div className={styles.quickFiltersToggleContainer}>
			<Button
				className="periscope-btn ghost"
				type="text"
				size="small"
				onClick={handleFilterVisibilityChange}
			>
				<Filter size={14} />
			</Button>
		</div>
	) : undefined;

	return (
		<>
			<div className={styles.infraMonitoringContainer}>
				<div className={styles.infraContentRow}>
					{showFilters && (
						<div className={styles.quickFiltersContainer}>
							<div className={styles.quickFiltersContainerHeader}>
								<Typography.Text>Filters</Typography.Text>
								<Tooltip title="Collapse Filters">
									<VerticalAlignTopOutlined
										rotate={270}
										onClick={handleFilterVisibilityChange}
									/>
								</Tooltip>
							</div>
							<QuickFilters
								source={QuickFiltersSource.INFRA_MONITORING}
								config={getHostsQuickFiltersConfig(dotMetricsEnabled)}
								handleFilterVisibilityChange={handleFilterVisibilityChange}
								onFilterChange={handleQuickFiltersChange}
							/>
						</div>
					)}
					<div
						className={`${styles.listContainer}${
							showFilters ? ` ${styles.listContainerFiltersVisible}` : ''
						}`}
					>
						<K8sBaseList
							controlListPrefix={controlListPrefix}
							entity={InfraMonitoringEntity.HOSTS}
							tableColumnsDefinitions={hostColumns}
							tableColumns={hostColumnsConfig}
							fetchListData={fetchListData}
							renderRowData={hostRenderRowData}
							renderEmptyState={hostRenderEmptyState}
							eventCategory={InfraMonitoringEvents.HostEntity}
						/>
					</div>
				</div>
			</div>
			<K8sBaseDetails
				category={InfraMonitoringEntity.HOSTS}
				eventCategory={InfraMonitoringEvents.HostEntity}
				getSelectedItemFilters={getSelectedItemFilters}
				fetchEntityData={fetchEntityData}
				getEntityName={hostGetEntityName}
				getInitialLogTracesFilters={getInitialLogTracesFilters}
				getInitialEventsFilters={hostInitialEventsFilter}
				primaryFilterKeys={primaryFilterKeys}
				metadataConfig={hostDetailsMetadataConfig}
				entityWidgetInfo={hostWidgetInfo}
				getEntityQueryPayload={getHostMetricsQueryPayload}
				queryKeyPrefix="hosts"
				tabsConfig={{
					showEvents: false,
					showContainers: true,
					showProcesses: true,
				}}
			/>
		</>
	);
}

export default Hosts;
