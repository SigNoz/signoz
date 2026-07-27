import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import { listStatefulSets } from 'api/generated/services/inframonitoring';
import {
	InframonitoringtypesResponseTypeDTO,
	InframonitoringtypesStatefulSetRecordDTO,
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

async function fetchListData(
	filters: K8sBaseFilters,
	signal?: AbortSignal,
): ReturnType<
	K8sEntityConfig<
		InframonitoringtypesStatefulSetRecordDTO,
		SelectedItemParams
	>['list']['fetchListData']
> {
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
}

async function fetchEntityData(
	filters: K8sDetailsFilters,
	signal?: AbortSignal,
): ReturnType<
	K8sEntityConfig<
		InframonitoringtypesStatefulSetRecordDTO,
		SelectedItemParams
	>['details']['fetchEntityData']
> {
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
}

export const statefulSetEntityConfig: K8sEntityConfig<
	InframonitoringtypesStatefulSetRecordDTO,
	SelectedItemParams
> = {
	list: {
		entity: InfraMonitoringEntity.STATEFULSETS,
		eventCategory: InfraMonitoringEvents.StatefulSet,
		tableColumns: k8sStatefulSetsColumnsConfig,
		fetchListData,
		getRowKey: getK8sStatefulSetRowKey,
		getItemKey: getK8sStatefulSetItemKey,
		detailsQueryKeyPrefix: 'statefulSet',
	},
	details: {
		category: InfraMonitoringEntity.STATEFULSETS,
		eventCategory: InfraMonitoringEvents.StatefulSet,
		queryKeyPrefix: 'statefulSet',
		getSelectedItemExpression: k8sStatefulSetGetSelectedItemExpression,
		fetchEntityData,
		getEntityName: k8sStatefulSetGetEntityName,
		getInitialLogTracesExpression: k8sStatefulSetInitialLogTracesExpression,
		getInitialEventsExpression: k8sStatefulSetInitialEventsExpression,
		metadataConfig: k8sStatefulSetDetailsMetadataConfig,
		entityWidgetInfo: statefulSetWidgetInfo,
		getEntityQueryPayload: getStatefulSetMetricsQueryPayload,
		customTabs: [
			createPodMetricsTab<InframonitoringtypesStatefulSetRecordDTO>({
				getQueryPayload: getStatefulSetPodMetricsQueryPayload,
				category: InfraMonitoringEntity.STATEFULSETS,
				queryKey: 'statefulSetPodMetrics',
				docBasePath: '/infrastructure-monitoring/kubernetes/statefulsets/',
			}),
		],
	},
};
