import { useCallback, useMemo } from 'react';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import { listStatefulSets } from 'api/generated/services/inframonitoring';
import { RenderErrorResponseDTO } from 'api/generated/services/sigNoz.schemas';
import { AxiosError } from 'axios';
import {
	InframonitoringtypesResponseTypeDTO,
	InframonitoringtypesStatefulSetRecordDTO,
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
	getStatefulSetMetricsQueryPayload,
	getStatefulSetPodMetricsQueryPayload,
	k8sStatefulSetDetailsMetadataConfig,
	k8sStatefulSetGetEntityName,
	k8sStatefulSetGetSelectedItemExpression,
	k8sStatefulSetInitialEventsExpression,
	k8sStatefulSetInitialLogTracesExpression,
	statefulSetWidgetInfo,
} from './constants';
import {
	getK8sStatefulSetItemKey,
	getK8sStatefulSetRowKey,
	k8sStatefulSetsColumnsConfig,
} from './table.config';
import { createPodMetricsTab } from 'container/InfraMonitoringK8sV2/EntityDetailsUtils/createPodMetricsTab';

function K8sStatefulSetsList({
	controlListPrefix,
}: {
	controlListPrefix?: React.ReactNode;
}): JSX.Element {
	const fetchListData = useCallback(
		async (filters: K8sBaseFilters, signal?: AbortSignal) => {
			try {
				const response = await listStatefulSets(
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
					records: [] as InframonitoringtypesStatefulSetRecordDTO[],
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
			data: InframonitoringtypesStatefulSetRecordDTO | null;
			error?: APIError | null;
		}> => {
			try {
				const response = await listStatefulSets(
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
			createPodMetricsTab<InframonitoringtypesStatefulSetRecordDTO>({
				getQueryPayload: getStatefulSetPodMetricsQueryPayload,
				category: InfraMonitoringEntity.STATEFULSETS,
				queryKey: 'statefulSetPodMetrics',
			}),
		],
		[],
	);

	return (
		<>
			<K8sBaseList<InframonitoringtypesStatefulSetRecordDTO, SelectedItemParams>
				controlListPrefix={controlListPrefix}
				entity={InfraMonitoringEntity.STATEFULSETS}
				tableColumns={k8sStatefulSetsColumnsConfig}
				fetchListData={fetchListData}
				getRowKey={getK8sStatefulSetRowKey}
				getItemKey={getK8sStatefulSetItemKey}
				eventCategory={InfraMonitoringEvents.StatefulSet}
				detailsQueryKeyPrefix="statefulSet"
			/>

			<K8sBaseDetails<InframonitoringtypesStatefulSetRecordDTO>
				category={InfraMonitoringEntity.STATEFULSETS}
				eventCategory={InfraMonitoringEvents.StatefulSet}
				getSelectedItemExpression={k8sStatefulSetGetSelectedItemExpression}
				fetchEntityData={fetchEntityData}
				getEntityName={k8sStatefulSetGetEntityName}
				getInitialLogTracesExpression={k8sStatefulSetInitialLogTracesExpression}
				getInitialEventsExpression={k8sStatefulSetInitialEventsExpression}
				metadataConfig={k8sStatefulSetDetailsMetadataConfig}
				entityWidgetInfo={statefulSetWidgetInfo}
				getEntityQueryPayload={getStatefulSetMetricsQueryPayload}
				queryKeyPrefix="statefulSet"
				customTabs={customTabs}
			/>
		</>
	);
}

export default K8sStatefulSetsList;
