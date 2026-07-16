import { useCallback } from 'react';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import { listPods } from 'api/generated/services/inframonitoring';
import { RenderErrorResponseDTO } from 'api/generated/services/sigNoz.schemas';
import { AxiosError } from 'axios';
import {
	InframonitoringtypesPodRecordDTO,
	InframonitoringtypesResponseTypeDTO,
	Querybuildertypesv5OrderDirectionDTO,
} from 'api/generated/services/sigNoz.schemas';
import { InfraMonitoringEvents } from 'constants/events';
import APIError from 'types/api/error';

import K8sBaseDetails, { K8sDetailsFilters } from '../Base/K8sBaseDetails';
import { K8sBaseList } from '../Base/K8sBaseList';
import { K8sBaseFilters } from '../Base/types';
import { InfraMonitoringEntity } from '../constants';
import {
	getPodMetricsQueryPayload,
	k8sPodDetailsMetadataConfig,
	k8sPodGetEntityName,
	k8sPodGetSelectedItemExpression,
	k8sPodInitialEventsExpression,
	k8sPodInitialLogTracesExpression,
	podWidgetInfo,
} from './constants';
import {
	getK8sPodItemKey,
	getK8sPodRowKey,
	k8sPodColumnsConfig,
} from './table.config';

function K8sPodsList({
	controlListPrefix,
}: {
	controlListPrefix?: React.ReactNode;
}): JSX.Element {
	const fetchListData = useCallback(
		async (filters: K8sBaseFilters, signal?: AbortSignal) => {
			try {
				const response = await listPods(
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
					records: [] as InframonitoringtypesPodRecordDTO[],
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
			data: InframonitoringtypesPodRecordDTO | null;
			error?: APIError | null;
		}> => {
			try {
				const response = await listPods(
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

	return (
		<>
			<K8sBaseList<InframonitoringtypesPodRecordDTO>
				controlListPrefix={controlListPrefix}
				entity={InfraMonitoringEntity.PODS}
				tableColumns={k8sPodColumnsConfig}
				fetchListData={fetchListData}
				getRowKey={getK8sPodRowKey}
				getItemKey={getK8sPodItemKey}
				eventCategory={InfraMonitoringEvents.Pod}
				detailsQueryKeyPrefix="pod"
			/>

			<K8sBaseDetails<InframonitoringtypesPodRecordDTO>
				category={InfraMonitoringEntity.PODS}
				eventCategory={InfraMonitoringEvents.Pod}
				getSelectedItemExpression={k8sPodGetSelectedItemExpression}
				fetchEntityData={fetchEntityData}
				getEntityName={k8sPodGetEntityName}
				getInitialLogTracesExpression={k8sPodInitialLogTracesExpression}
				getInitialEventsExpression={k8sPodInitialEventsExpression}
				metadataConfig={k8sPodDetailsMetadataConfig}
				entityWidgetInfo={podWidgetInfo}
				getEntityQueryPayload={getPodMetricsQueryPayload}
				queryKeyPrefix="pod"
			/>
		</>
	);
}

export default K8sPodsList;
