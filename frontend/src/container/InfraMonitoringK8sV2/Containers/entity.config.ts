import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import { listContainers } from 'api/generated/services/inframonitoring';
import {
	InframonitoringtypesContainerRecordDTO,
	InframonitoringtypesResponseTypeDTO,
	Querybuildertypesv5OrderDirectionDTO,
	RenderErrorResponseDTO,
} from 'api/generated/services/sigNoz.schemas';
import { AxiosError } from 'axios';
import { InfraMonitoringEvents } from 'constants/events';

import { K8sEntityConfig } from '../Base/entity.config.types';
import { K8sBaseFilters, K8sDetailsFilters } from '../Base/types';
import { InfraMonitoringEntity } from '../constants';
import { SelectedItemParams } from '../hooks';
import {
	containerWidgetInfo,
	k8sContainerDetailsMetadataConfig,
	k8sContainerGetEntityName,
	k8sContainerGetSelectedItemExpression,
	k8sContainerInitialEventsExpression,
	k8sContainerInitialLogTracesExpression,
} from './constants';
import { getContainerMetricsQueryPayload } from './metrics';
import {
	getK8sContainerItemKey,
	getK8sContainerRowKey,
	k8sContainerColumnsConfig,
} from './table.config';

async function fetchListData(
	filters: K8sBaseFilters,
	signal?: AbortSignal,
): ReturnType<
	K8sEntityConfig<
		InframonitoringtypesContainerRecordDTO,
		SelectedItemParams
	>['list']['fetchListData']
> {
	try {
		const response = await listContainers(
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
			records: [] as InframonitoringtypesContainerRecordDTO[],
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
	K8sEntityConfig<InframonitoringtypesContainerRecordDTO>['details']['fetchEntityData']
> {
	try {
		const response = await listContainers(
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

export const containerEntityConfig: K8sEntityConfig<
	InframonitoringtypesContainerRecordDTO,
	SelectedItemParams
> = {
	list: {
		entity: InfraMonitoringEntity.CONTAINERS,
		eventCategory: InfraMonitoringEvents.Container,
		tableColumns: k8sContainerColumnsConfig,
		fetchListData,
		getRowKey: getK8sContainerRowKey,
		getItemKey: getK8sContainerItemKey,
		detailsQueryKeyPrefix: 'container',
	},
	details: {
		category: InfraMonitoringEntity.CONTAINERS,
		eventCategory: InfraMonitoringEvents.Container,
		queryKeyPrefix: 'container',
		getSelectedItemExpression: k8sContainerGetSelectedItemExpression,
		fetchEntityData,
		getEntityName: k8sContainerGetEntityName,
		getInitialLogTracesExpression: k8sContainerInitialLogTracesExpression,
		getInitialEventsExpression: k8sContainerInitialEventsExpression,
		metadataConfig: k8sContainerDetailsMetadataConfig,
		entityWidgetInfo: containerWidgetInfo,
		getEntityQueryPayload: getContainerMetricsQueryPayload,
	},
};
