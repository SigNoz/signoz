import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import { listNamespaces } from 'api/generated/services/inframonitoring';
import {
	InframonitoringtypesNamespaceRecordDTO,
	InframonitoringtypesResponseTypeDTO,
	Querybuildertypesv5OrderDirectionDTO,
	RenderErrorResponseDTO,
} from 'api/generated/services/sigNoz.schemas';
import { AxiosError } from 'axios';
import { InfraMonitoringEvents } from 'constants/events';
import { createPodMetricsTab } from 'container/InfraMonitoringK8sV2/EntityDetailsUtils/createPodMetricsTab';

import { K8sEntityConfig } from '../Base/entity.config.types';
import { K8sBaseFilters, K8sDetailsFilters } from '../Base/types';
import { InfraMonitoringEntity } from '../constants';
import { SelectedItemParams } from '../hooks';
import {
	getNamespaceMetricsQueryPayload,
	getNamespacePodMetricsQueryPayload,
	k8sNamespaceDetailsCountsConfig,
	k8sNamespaceDetailsMetadataConfig,
	k8sNamespaceGetCountsFilterExpression,
	k8sNamespaceGetEntityName,
	k8sNamespaceGetSelectedItemExpression,
	k8sNamespaceInitialEventsExpression,
	k8sNamespaceInitialLogTracesExpression,
	namespaceWidgetInfo,
} from './constants';
import {
	getK8sNamespaceItemKey,
	getK8sNamespaceRowKey,
	k8sNamespacesColumnsConfig,
} from './table.config';

async function fetchListData(
	filters: K8sBaseFilters,
	signal?: AbortSignal,
): ReturnType<
	K8sEntityConfig<
		InframonitoringtypesNamespaceRecordDTO,
		SelectedItemParams
	>['list']['fetchListData']
> {
	try {
		const response = await listNamespaces(
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
			records: [] as InframonitoringtypesNamespaceRecordDTO[],
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
		InframonitoringtypesNamespaceRecordDTO,
		SelectedItemParams
	>['details']['fetchEntityData']
> {
	try {
		const response = await listNamespaces(
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

const namespaceCustomTabs = [
	createPodMetricsTab<InframonitoringtypesNamespaceRecordDTO>({
		getQueryPayload: getNamespacePodMetricsQueryPayload,
		category: InfraMonitoringEntity.NAMESPACES,
		queryKey: 'namespacePodMetrics',
		docBasePath: '/infrastructure-monitoring/kubernetes/namespaces/',
	}),
];

export const namespaceEntityConfig: K8sEntityConfig<
	InframonitoringtypesNamespaceRecordDTO,
	SelectedItemParams
> = {
	list: {
		entity: InfraMonitoringEntity.NAMESPACES,
		eventCategory: InfraMonitoringEvents.Namespace,
		tableColumns: k8sNamespacesColumnsConfig,
		fetchListData,
		getRowKey: getK8sNamespaceRowKey,
		getItemKey: getK8sNamespaceItemKey,
		detailsQueryKeyPrefix: 'namespace',
	},
	details: {
		category: InfraMonitoringEntity.NAMESPACES,
		eventCategory: InfraMonitoringEvents.Namespace,
		queryKeyPrefix: 'namespace',
		getSelectedItemExpression: k8sNamespaceGetSelectedItemExpression,
		fetchEntityData,
		getEntityName: k8sNamespaceGetEntityName,
		getInitialLogTracesExpression: k8sNamespaceInitialLogTracesExpression,
		getInitialEventsExpression: k8sNamespaceInitialEventsExpression,
		metadataConfig: k8sNamespaceDetailsMetadataConfig,
		countsConfig: k8sNamespaceDetailsCountsConfig,
		getCountsFilterExpression: k8sNamespaceGetCountsFilterExpression,
		entityWidgetInfo: namespaceWidgetInfo,
		getEntityQueryPayload: getNamespaceMetricsQueryPayload,
		customTabs: namespaceCustomTabs,
	},
};
