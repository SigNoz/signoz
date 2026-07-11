import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Tooltip } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import { listHosts } from 'api/generated/services/inframonitoring';
import {
	InframonitoringtypesHostRecordDTO,
	InframonitoringtypesHostStatusDTO,
	InframonitoringtypesResponseTypeDTO,
	Querybuildertypesv5OrderDirectionDTO,
} from 'api/generated/services/sigNoz.schemas';
import QuickFilters from 'components/QuickFilters/QuickFilters';
import { QuickFiltersSource } from 'components/QuickFilters/types';
import { InfraMonitoringEvents } from 'constants/events';
import { FeatureKeys } from 'constants/features';
import { initialQueriesMap } from 'constants/queryBuilder';
import K8sBaseDetails, {
	K8sDetailsFilters,
} from 'container/InfraMonitoringK8sV2/Base/K8sBaseDetails';
import { K8sBaseList } from 'container/InfraMonitoringK8sV2/Base/K8sBaseList';
import StatusFilter from 'container/InfraMonitoringHostsV2/StatusFilter';
import { K8sBaseFilters } from 'container/InfraMonitoringK8sV2/Base/types';
import { InfraMonitoringEntity } from 'container/InfraMonitoringK8sV2/constants';
import { useGetCompositeQueryParam } from 'hooks/queryBuilder/useGetCompositeQueryParam';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useAppContext } from 'providers/App/App';
import { DataSource } from 'types/common/queryBuilder';

import {
	getHostMetricsQueryPayload,
	hostDetailsMetadataConfig,
	hostGetEntityName,
	hostGetSelectedItemExpression,
	hostInitialEventsExpression,
	hostInitialLogTracesExpression,
	hostWidgetInfo,
} from './constants';
import {
	getHostItemKey,
	getHostRowKey,
	hostColumnsConfig,
} from './table.config';
import { getHostsQuickFiltersConfig } from './utils';

import styles from './InfraMonitoringHosts.module.scss';
import { ArrowUpToLine, Filter } from '@signozhq/icons';

function Hosts(): JSX.Element {
	const [showFilters, setShowFilters] = useState(true);

	const compositeQuery = useGetCompositeQueryParam();
	const { redirectWithQueryBuilderData } = useQueryBuilder();
	const isInitialized = useRef(false);

	useEffect(() => {
		if (isInitialized.current) {
			return;
		}
		isInitialized.current = true;

		if (!compositeQuery) {
			const defaultQuery = initialQueriesMap[DataSource.METRICS];
			redirectWithQueryBuilderData({
				...defaultQuery,
				builder: {
					...defaultQuery.builder,
					queryData: defaultQuery.builder.queryData.map((query) => ({
						...query,
						filter: { expression: '' },
						filters: { items: [], op: 'AND' as const },
					})),
				},
			});
		}
	}, [compositeQuery, redirectWithQueryBuilderData]);

	const { featureFlags } = useAppContext();
	const dotMetricsEnabled =
		featureFlags?.find((flag) => flag.name === FeatureKeys.DOT_METRICS_ENABLED)
			?.active || false;

	const handleFilterVisibilityChange = (): void => {
		setShowFilters(!showFilters);
	};

	const fetchListData = useCallback(
		async (filters: K8sBaseFilters, signal?: AbortSignal) => {
			try {
				const response = await listHosts(
					{
						filter: {
							expression: filters.filter.expression,
							filterByStatus: filters.filter.filterByStatus
								? (filters.filter.filterByStatus as InframonitoringtypesHostStatusDTO)
								: undefined,
						},
						groupBy: filters.groupBy?.map((g) => ({ name: g.name })),
						offset: filters.offset,
						limit: filters.limit ?? 10,
						start: filters.start,
						end: filters.end,
						orderBy: filters.orderBy
							? {
									key: { name: filters.orderBy.key.name },
									direction:
										filters.orderBy.direction === 'asc'
											? Querybuildertypesv5OrderDirectionDTO.asc
											: Querybuildertypesv5OrderDirectionDTO.desc,
								}
							: undefined,
					},
					signal,
				);

				const data = response.data;
				return {
					type:
						data.type === InframonitoringtypesResponseTypeDTO.grouped_list
							? ('grouped_list' as const)
							: ('list' as const),
					records: data.records,
					total: data.total,
					endTimeBeforeRetention: data.endTimeBeforeRetention,
				};
			} catch (error) {
				const errMsg =
					error instanceof Error ? error.message : 'Failed to fetch hosts';
				return {
					type: 'list' as const,
					records: [] as InframonitoringtypesHostRecordDTO[],
					total: 0,
					error: errMsg,
				};
			}
		},
		[],
	);

	const fetchEntityData = useCallback(
		async (
			filters: K8sDetailsFilters,
			signal?: AbortSignal,
		): Promise<{
			data: InframonitoringtypesHostRecordDTO | null;
			error?: string | null;
		}> => {
			try {
				const response = await listHosts(
					{
						filter: { expression: filters.filter.expression },
						start: filters.start,
						end: filters.end,
						limit: 1,
						offset: 0,
					},
					signal,
				);

				return {
					data: response.data.records.length > 0 ? response.data.records[0] : null,
				};
			} catch (error) {
				const errMsg =
					error instanceof Error ? error.message : 'Failed to fetch host';
				return {
					data: null,
					error: errMsg,
				};
			}
		},
		[],
	);

	const getInitialLogTracesExpression = useCallback(
		(host: InframonitoringtypesHostRecordDTO) =>
			hostInitialLogTracesExpression(host, dotMetricsEnabled),
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
									<ArrowUpToLine
										style={{ rotate: '270deg', cursor: 'pointer' }}
										onClick={handleFilterVisibilityChange}
										size="md"
									/>
								</Tooltip>
							</div>
							<QuickFilters
								source={QuickFiltersSource.INFRA_MONITORING}
								config={getHostsQuickFiltersConfig(dotMetricsEnabled)}
								handleFilterVisibilityChange={handleFilterVisibilityChange}
							/>
						</div>
					)}
					<div
						className={`${styles.listContainer}${
							showFilters ? ` ${styles.listContainerFiltersVisible}` : ''
						}`}
					>
						<K8sBaseList<InframonitoringtypesHostRecordDTO>
							controlListPrefix={controlListPrefix}
							leftFilters={<StatusFilter />}
							entity={InfraMonitoringEntity.HOSTS}
							tableColumns={hostColumnsConfig}
							fetchListData={fetchListData}
							getRowKey={getHostRowKey}
							getItemKey={getHostItemKey}
							eventCategory={InfraMonitoringEvents.HostEntity}
						/>
					</div>
				</div>
			</div>
			<K8sBaseDetails
				category={InfraMonitoringEntity.HOSTS}
				eventCategory={InfraMonitoringEvents.HostEntity}
				getSelectedItemExpression={hostGetSelectedItemExpression}
				fetchEntityData={fetchEntityData}
				getEntityName={hostGetEntityName}
				getInitialLogTracesExpression={getInitialLogTracesExpression}
				getInitialEventsExpression={hostInitialEventsExpression}
				metadataConfig={hostDetailsMetadataConfig}
				entityWidgetInfo={hostWidgetInfo}
				getEntityQueryPayload={getHostMetricsQueryPayload}
				queryKeyPrefix="hosts"
				tabsConfig={{
					showEvents: false,
				}}
			/>
		</>
	);
}

export default Hosts;
