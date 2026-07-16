import { useCallback, useMemo } from 'react';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import { listDaemonSets } from 'api/generated/services/inframonitoring';
import { RenderErrorResponseDTO } from 'api/generated/services/sigNoz.schemas';
import { AxiosError } from 'axios';
import {
	InframonitoringtypesDaemonSetRecordDTO,
	InframonitoringtypesResponseTypeDTO,
	Querybuildertypesv5OrderDirectionDTO,
} from 'api/generated/services/sigNoz.schemas';
import { InfraMonitoringEvents } from 'constants/events';
import APIError from 'types/api/error';

import K8sBaseDetails, { K8sDetailsFilters } from '../Base/K8sBaseDetails';
import { K8sBaseList } from '../Base/K8sBaseList';
import { K8sBaseFilters } from '../Base/types';
import { InfraMonitoringEntity } from '../constants';
import { SelectedItemParams } from '../hooks';
import {
	daemonSetWidgetInfo,
	getDaemonSetMetricsQueryPayload,
	getDaemonSetPodMetricsQueryPayload,
	k8sDaemonSetDetailsMetadataConfig,
	k8sDaemonSetGetEntityName,
	k8sDaemonSetGetSelectedItemExpression,
	k8sDaemonSetInitialEventsExpression,
	k8sDaemonSetInitialLogTracesExpression,
} from './constants';
import {
	getK8sDaemonSetItemKey,
	getK8sDaemonSetRowKey,
	k8sDaemonSetsColumnsConfig,
} from './table.config';
import { createPodMetricsTab } from 'container/InfraMonitoringK8sV2/EntityDetailsUtils/createPodMetricsTab';

function K8sDaemonSetsList({
	controlListPrefix,
}: {
	controlListPrefix?: React.ReactNode;
}): JSX.Element {
	const fetchListData = useCallback(
		async (filters: K8sBaseFilters, signal?: AbortSignal) => {
			try {
				const response = await listDaemonSets(
					{
						filter: { expression: filters.filter.expression },
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
					warning: data.warning,
				};
			} catch (error) {
				return {
					type: 'list' as const,
					records: [] as InframonitoringtypesDaemonSetRecordDTO[],
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
			data: InframonitoringtypesDaemonSetRecordDTO | null;
			error?: APIError | null;
		}> => {
			try {
				const response = await listDaemonSets(
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
	const customTabs = useMemo(
		() => [
			createPodMetricsTab<InframonitoringtypesDaemonSetRecordDTO>({
				getQueryPayload: getDaemonSetPodMetricsQueryPayload,
				category: InfraMonitoringEntity.DAEMONSETS,
				queryKey: 'daemonSetPodMetrics',
			}),
		],
		[],
	);

	return (
		<>
			<K8sBaseList<InframonitoringtypesDaemonSetRecordDTO, SelectedItemParams>
				controlListPrefix={controlListPrefix}
				entity={InfraMonitoringEntity.DAEMONSETS}
				tableColumns={k8sDaemonSetsColumnsConfig}
				fetchListData={fetchListData}
				getRowKey={getK8sDaemonSetRowKey}
				getItemKey={getK8sDaemonSetItemKey}
				eventCategory={InfraMonitoringEvents.DaemonSet}
				detailsQueryKeyPrefix="daemonset"
			/>
			<K8sBaseDetails<InframonitoringtypesDaemonSetRecordDTO>
				category={InfraMonitoringEntity.DAEMONSETS}
				eventCategory={InfraMonitoringEvents.DaemonSet}
				getSelectedItemExpression={k8sDaemonSetGetSelectedItemExpression}
				fetchEntityData={fetchEntityData}
				getEntityName={k8sDaemonSetGetEntityName}
				getInitialLogTracesExpression={k8sDaemonSetInitialLogTracesExpression}
				getInitialEventsExpression={k8sDaemonSetInitialEventsExpression}
				metadataConfig={k8sDaemonSetDetailsMetadataConfig}
				entityWidgetInfo={daemonSetWidgetInfo}
				getEntityQueryPayload={getDaemonSetMetricsQueryPayload}
				queryKeyPrefix="daemonset"
				customTabs={customTabs}
			/>
		</>
	);
}
export default K8sDaemonSetsList;
