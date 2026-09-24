import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import { listNodes } from 'api/generated/services/inframonitoring';
import {
	InframonitoringtypesNodeRecordDTO,
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
	getNodeMetricsQueryPayload,
	k8sNodeDetailsMetadataConfig,
	k8sNodeGetEntityName,
	k8sNodeGetSelectedItemExpression,
	k8sNodeInitialEventsExpression,
	k8sNodeInitialLogTracesExpression,
	nodeWidgetInfo,
} from './constants';
import {
	getK8sNodeItemKey,
	getK8sNodeRowKey,
	k8sNodesColumnsConfig,
} from './table.config';

async function fetchListData(
	filters: K8sBaseFilters,
	signal?: AbortSignal,
): ReturnType<
	K8sEntityConfig<
		InframonitoringtypesNodeRecordDTO,
		string
	>['list']['fetchListData']
> {
	try {
		const response = await listNodes(
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
			records: [] as InframonitoringtypesNodeRecordDTO[],
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
	K8sEntityConfig<
		InframonitoringtypesNodeRecordDTO,
		string
	>['details']['fetchEntityData']
> {
	try {
		const response = await listNodes(
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

export const nodeEntityConfig: K8sEntityConfig<
	InframonitoringtypesNodeRecordDTO,
	string
> = {
	list: {
		entity: InfraMonitoringEntity.NODES,
		eventCategory: InfraMonitoringEvents.Node,
		tableColumns: k8sNodesColumnsConfig,
		fetchListData,
		getRowKey: getK8sNodeRowKey,
		getItemKey: getK8sNodeItemKey,
		detailsQueryKeyPrefix: 'node',
	},
	details: {
		category: InfraMonitoringEntity.NODES,
		eventCategory: InfraMonitoringEvents.Node,
		queryKeyPrefix: 'node',
		getSelectedItemExpression: k8sNodeGetSelectedItemExpression,
		fetchEntityData,
		getEntityName: k8sNodeGetEntityName,
		getInitialLogTracesExpression: k8sNodeInitialLogTracesExpression,
		getInitialEventsExpression: k8sNodeInitialEventsExpression,
		metadataConfig: k8sNodeDetailsMetadataConfig,
		entityWidgetInfo: nodeWidgetInfo,
		getEntityQueryPayload: getNodeMetricsQueryPayload,
	},
};
