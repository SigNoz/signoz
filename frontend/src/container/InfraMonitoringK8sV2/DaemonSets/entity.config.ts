import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import { listDaemonSets } from 'api/generated/services/inframonitoring';
import {
	InframonitoringtypesDaemonSetRecordDTO,
	InframonitoringtypesResponseTypeDTO,
	Querybuildertypesv5OrderDirectionDTO,
	RenderErrorResponseDTO,
} from 'api/generated/services/sigNoz.schemas';
import { AxiosError } from 'axios';
import { InfraMonitoringEvents } from 'constants/events';

import { K8sEntityConfig } from '../Base/entity.config.types';
import { K8sBaseFilters, K8sDetailsFilters } from '../Base/types';
import { InfraMonitoringEntity } from '../constants';
import { createPodMetricsTab } from '../EntityDetailsUtils/createPodMetricsTab';
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

async function fetchListData(
	filters: K8sBaseFilters,
	signal?: AbortSignal,
): ReturnType<
	K8sEntityConfig<
		InframonitoringtypesDaemonSetRecordDTO,
		SelectedItemParams
	>['list']['fetchListData']
> {
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
}

async function fetchEntityData(
	filters: K8sDetailsFilters,
	signal?: AbortSignal,
): ReturnType<
	K8sEntityConfig<
		InframonitoringtypesDaemonSetRecordDTO,
		SelectedItemParams
	>['details']['fetchEntityData']
> {
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
}

export const daemonSetEntityConfig: K8sEntityConfig<
	InframonitoringtypesDaemonSetRecordDTO,
	SelectedItemParams
> = {
	list: {
		entity: InfraMonitoringEntity.DAEMONSETS,
		eventCategory: InfraMonitoringEvents.DaemonSet,
		tableColumns: k8sDaemonSetsColumnsConfig,
		fetchListData,
		getRowKey: getK8sDaemonSetRowKey,
		getItemKey: getK8sDaemonSetItemKey,
		detailsQueryKeyPrefix: 'daemonset',
	},
	details: {
		category: InfraMonitoringEntity.DAEMONSETS,
		eventCategory: InfraMonitoringEvents.DaemonSet,
		queryKeyPrefix: 'daemonset',
		getSelectedItemExpression: k8sDaemonSetGetSelectedItemExpression,
		fetchEntityData,
		getEntityName: k8sDaemonSetGetEntityName,
		getInitialLogTracesExpression: k8sDaemonSetInitialLogTracesExpression,
		getInitialEventsExpression: k8sDaemonSetInitialEventsExpression,
		metadataConfig: k8sDaemonSetDetailsMetadataConfig,
		entityWidgetInfo: daemonSetWidgetInfo,
		getEntityQueryPayload: getDaemonSetMetricsQueryPayload,
		customTabs: [
			createPodMetricsTab<InframonitoringtypesDaemonSetRecordDTO>({
				getQueryPayload: getDaemonSetPodMetricsQueryPayload,
				category: InfraMonitoringEntity.DAEMONSETS,
				queryKey: 'daemonSetPodMetrics',
				docBasePath: '/infrastructure-monitoring/kubernetes/daemonsets/',
			}),
		],
	},
};
