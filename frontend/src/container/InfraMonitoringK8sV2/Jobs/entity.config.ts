import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import { listJobs } from 'api/generated/services/inframonitoring';
import {
	InframonitoringtypesJobRecordDTO,
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
	getJobMetricsQueryPayload,
	getJobPodMetricsQueryPayload,
	jobWidgetInfo,
	k8sJobDetailsMetadataConfig,
	k8sJobGetEntityName,
	k8sJobGetSelectedItemExpression,
	k8sJobInitialEventsExpression,
	k8sJobInitialLogTracesExpression,
} from './constants';
import {
	getK8sJobItemKey,
	getK8sJobRowKey,
	k8sJobsColumnsConfig,
} from './table.config';

async function fetchListData(
	filters: K8sBaseFilters,
	signal?: AbortSignal,
): ReturnType<
	K8sEntityConfig<
		InframonitoringtypesJobRecordDTO,
		SelectedItemParams
	>['list']['fetchListData']
> {
	try {
		const response = await listJobs(
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
			records: [] as InframonitoringtypesJobRecordDTO[],
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
		InframonitoringtypesJobRecordDTO,
		SelectedItemParams
	>['details']['fetchEntityData']
> {
	try {
		const response = await listJobs(
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

export const jobEntityConfig: K8sEntityConfig<
	InframonitoringtypesJobRecordDTO,
	SelectedItemParams
> = {
	list: {
		entity: InfraMonitoringEntity.JOBS,
		eventCategory: InfraMonitoringEvents.Job,
		tableColumns: k8sJobsColumnsConfig,
		fetchListData,
		getRowKey: getK8sJobRowKey,
		getItemKey: getK8sJobItemKey,
		detailsQueryKeyPrefix: 'job',
	},
	details: {
		category: InfraMonitoringEntity.JOBS,
		eventCategory: InfraMonitoringEvents.Job,
		queryKeyPrefix: 'job',
		getSelectedItemExpression: k8sJobGetSelectedItemExpression,
		fetchEntityData,
		getEntityName: k8sJobGetEntityName,
		getInitialLogTracesExpression: k8sJobInitialLogTracesExpression,
		getInitialEventsExpression: k8sJobInitialEventsExpression,
		metadataConfig: k8sJobDetailsMetadataConfig,
		entityWidgetInfo: jobWidgetInfo,
		getEntityQueryPayload: getJobMetricsQueryPayload,
		customTabs: [
			createPodMetricsTab<InframonitoringtypesJobRecordDTO>({
				getQueryPayload: getJobPodMetricsQueryPayload,
				category: InfraMonitoringEntity.JOBS,
				queryKey: 'jobPodMetrics',
				docBasePath: '/infrastructure-monitoring/kubernetes/jobs/',
			}),
		],
	},
};
