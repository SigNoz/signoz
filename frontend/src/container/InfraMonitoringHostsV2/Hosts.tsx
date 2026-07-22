import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Tooltip } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import { listHosts } from 'api/generated/services/inframonitoring';
import {
	InframonitoringtypesHostRecordDTO,
	InframonitoringtypesHostStatusDTO,
	InframonitoringtypesResponseTypeDTO,
	Querybuildertypesv5OrderDirectionDTO,
	RenderErrorResponseDTO,
} from 'api/generated/services/sigNoz.schemas';
import { AxiosError } from 'axios';
import APIError from 'types/api/error';
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
import {
	InfraMonitoringEntity,
	METRIC_NAMESPACE_BY_ENTITY,
} from 'container/InfraMonitoringK8sV2/constants';
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
import { NANO_SECOND_MULTIPLIER, useGlobalTimeStore } from 'store/globalTime';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';

function Hosts(): JSX.Element {
	const [showFilters, setShowFilters] = useState(true);

	const compositeQuery = useGetCompositeQueryParam();
	const { redirectWithQueryBuilderData } = useQueryBuilder();
	const isInitialized = useRef(false);

	const selectedTime = useGlobalTimeStore((state) => state.selectedTime);
	const getMinMaxTime = useGlobalTimeStore((state) => state.getMinMaxTime);
	const { startUnixMilli, endUnixMilli } = useMemo(() => {
		const { minTime, maxTime } = getMinMaxTime();
		return {
			startUnixMilli: Math.floor(minTime / NANO_SECOND_MULTIPLIER),
			endUnixMilli: Math.floor(maxTime / NANO_SECOND_MULTIPLIER),
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedTime, getMinMaxTime]);

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
				return {
					type: 'list' as const,
					records: [] as InframonitoringtypesHostRecordDTO[],
					total: 0,
					error:
						convertToApiError(error as AxiosError<RenderErrorResponseDTO>) ?? null,
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
			error?: APIError | null;
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
				return {
					data: null,
					error:
						convertToApiError(error as AxiosError<RenderErrorResponseDTO>) ?? null,
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
							<OverlayScrollbar>
								<>
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
										useFieldApis={{
											metricNamespace:
												METRIC_NAMESPACE_BY_ENTITY[InfraMonitoringEntity.HOSTS],
											startUnixMilli,
											endUnixMilli,
										}}
									/>
								</>
							</OverlayScrollbar>
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
							detailsQueryKeyPrefix="hosts"
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
