import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import { listClusters } from 'api/generated/services/inframonitoring';
import {
	InframonitoringtypesClusterRecordDTO,
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
	clusterWidgetInfo,
	getClusterMetricsQueryPayload,
	k8sClusterDetailsCountsConfig,
	k8sClusterDetailsMetadataConfig,
	k8sClusterGetCountsFilterExpression,
	k8sClusterGetEntityName,
	k8sClusterGetSelectedItemExpression,
	k8sClusterInitialEventsExpression,
	k8sClusterInitialLogTracesExpression,
} from './constants';
import {
	getK8sClusterItemKey,
	getK8sClusterRowKey,
	k8sClustersColumnsConfig,
} from './table.config';

async function fetchListData(
	filters: K8sBaseFilters,
	signal?: AbortSignal,
): ReturnType<
	K8sEntityConfig<InframonitoringtypesClusterRecordDTO>['list']['fetchListData']
> {
	try {
		const response = await listClusters(
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
			records: [] as InframonitoringtypesClusterRecordDTO[],
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
	K8sEntityConfig<InframonitoringtypesClusterRecordDTO>['details']['fetchEntityData']
> {
	try {
		const response = await listClusters(
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

export const clusterEntityConfig: K8sEntityConfig<InframonitoringtypesClusterRecordDTO> =
	{
		list: {
			entity: InfraMonitoringEntity.CLUSTERS,
			eventCategory: InfraMonitoringEvents.Cluster,
			tableColumns: k8sClustersColumnsConfig,
			fetchListData,
			getRowKey: getK8sClusterRowKey,
			getItemKey: getK8sClusterItemKey,
			detailsQueryKeyPrefix: 'cluster',
		},
		details: {
			category: InfraMonitoringEntity.CLUSTERS,
			eventCategory: InfraMonitoringEvents.Cluster,
			queryKeyPrefix: 'cluster',
			getSelectedItemExpression: k8sClusterGetSelectedItemExpression,
			fetchEntityData,
			getEntityName: k8sClusterGetEntityName,
			getInitialLogTracesExpression: k8sClusterInitialLogTracesExpression,
			getInitialEventsExpression: k8sClusterInitialEventsExpression,
			metadataConfig: k8sClusterDetailsMetadataConfig,
			entityWidgetInfo: clusterWidgetInfo,
			getEntityQueryPayload: getClusterMetricsQueryPayload,
			countsConfig: k8sClusterDetailsCountsConfig,
			getCountsFilterExpression: k8sClusterGetCountsFilterExpression,
		},
	};
