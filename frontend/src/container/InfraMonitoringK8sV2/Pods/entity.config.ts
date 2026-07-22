import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import { listPods } from 'api/generated/services/inframonitoring';
import {
	InframonitoringtypesPodRecordDTO,
	InframonitoringtypesResponseTypeDTO,
	Querybuildertypesv5OrderDirectionDTO,
	RenderErrorResponseDTO,
} from 'api/generated/services/sigNoz.schemas';
import { AxiosError } from 'axios';
import { InfraMonitoringEvents } from 'constants/events';

import { K8sEntityConfig } from '../Base/entity.config.types';
import { K8sBaseFilters, K8sDetailsFilters } from '../Base/types';
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

async function fetchListData(
	filters: K8sBaseFilters,
	signal?: AbortSignal,
): ReturnType<
	K8sEntityConfig<InframonitoringtypesPodRecordDTO>['list']['fetchListData']
> {
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
}

async function fetchEntityData(
	filters: K8sDetailsFilters,
	signal?: AbortSignal,
): ReturnType<
	K8sEntityConfig<InframonitoringtypesPodRecordDTO>['details']['fetchEntityData']
> {
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
}

export const podEntityConfig: K8sEntityConfig<InframonitoringtypesPodRecordDTO> =
	{
		list: {
			entity: InfraMonitoringEntity.PODS,
			eventCategory: InfraMonitoringEvents.Pod,
			tableColumns: k8sPodColumnsConfig,
			fetchListData,
			getRowKey: getK8sPodRowKey,
			getItemKey: getK8sPodItemKey,
			detailsQueryKeyPrefix: 'pod',
		},
		details: {
			category: InfraMonitoringEntity.PODS,
			eventCategory: InfraMonitoringEvents.Pod,
			queryKeyPrefix: 'pod',
			getSelectedItemExpression: k8sPodGetSelectedItemExpression,
			fetchEntityData,
			getEntityName: k8sPodGetEntityName,
			getInitialLogTracesExpression: k8sPodInitialLogTracesExpression,
			getInitialEventsExpression: k8sPodInitialEventsExpression,
			metadataConfig: k8sPodDetailsMetadataConfig,
			entityWidgetInfo: podWidgetInfo,
			getEntityQueryPayload: getPodMetricsQueryPayload,
		},
	};
