import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import { listDeployments } from 'api/generated/services/inframonitoring';
import {
	InframonitoringtypesDeploymentRecordDTO,
	InframonitoringtypesResponseTypeDTO,
	Querybuildertypesv5OrderDirectionDTO,
	RenderErrorResponseDTO,
} from 'api/generated/services/sigNoz.schemas';
import { AxiosError } from 'axios';
import { InfraMonitoringEvents } from 'constants/events';

import { K8sEntityConfig } from '../Base/entity.config.types';
import {
	K8sBaseFilters,
	K8sDetailsCustomTab,
	K8sDetailsFilters,
} from '../Base/types';
import { InfraMonitoringEntity } from '../constants';
import { createPodMetricsTab } from '../EntityDetailsUtils/createPodMetricsTab';
import { SelectedItemParams } from '../hooks';
import {
	deploymentWidgetInfo,
	getDeploymentMetricsQueryPayload,
	getDeploymentPodMetricsQueryPayload,
	k8sDeploymentDetailsMetadataConfig,
	k8sDeploymentGetEntityName,
	k8sDeploymentGetSelectedItemExpression,
	k8sDeploymentInitialEventsExpression,
	k8sDeploymentInitialLogTracesExpression,
} from './constants';
import {
	getK8sDeploymentItemKey,
	getK8sDeploymentRowKey,
	k8sDeploymentsColumnsConfig,
} from './table.config';

async function fetchListData(
	filters: K8sBaseFilters,
	signal?: AbortSignal,
): ReturnType<
	K8sEntityConfig<
		InframonitoringtypesDeploymentRecordDTO,
		SelectedItemParams
	>['list']['fetchListData']
> {
	try {
		const response = await listDeployments(
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
			records: [] as InframonitoringtypesDeploymentRecordDTO[],
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
		InframonitoringtypesDeploymentRecordDTO,
		SelectedItemParams
	>['details']['fetchEntityData']
> {
	try {
		const response = await listDeployments(
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

export function createCustomTabs(): K8sDetailsCustomTab<InframonitoringtypesDeploymentRecordDTO>[] {
	return [
		createPodMetricsTab<InframonitoringtypesDeploymentRecordDTO>({
			getQueryPayload: getDeploymentPodMetricsQueryPayload,
			category: InfraMonitoringEntity.DEPLOYMENTS,
			queryKey: 'deploymentPodMetrics',
			docBasePath: '/infrastructure-monitoring/kubernetes/deployments/',
		}),
	];
}

export const deploymentEntityConfig: K8sEntityConfig<
	InframonitoringtypesDeploymentRecordDTO,
	SelectedItemParams
> = {
	list: {
		entity: InfraMonitoringEntity.DEPLOYMENTS,
		eventCategory: InfraMonitoringEvents.Deployment,
		tableColumns: k8sDeploymentsColumnsConfig,
		fetchListData,
		getRowKey: getK8sDeploymentRowKey,
		getItemKey: getK8sDeploymentItemKey,
		detailsQueryKeyPrefix: 'deployment',
	},
	details: {
		category: InfraMonitoringEntity.DEPLOYMENTS,
		eventCategory: InfraMonitoringEvents.Deployment,
		queryKeyPrefix: 'deployment',
		getSelectedItemExpression: k8sDeploymentGetSelectedItemExpression,
		fetchEntityData,
		getEntityName: k8sDeploymentGetEntityName,
		getInitialLogTracesExpression: k8sDeploymentInitialLogTracesExpression,
		getInitialEventsExpression: k8sDeploymentInitialEventsExpression,
		metadataConfig: k8sDeploymentDetailsMetadataConfig,
		entityWidgetInfo: deploymentWidgetInfo,
		getEntityQueryPayload: getDeploymentMetricsQueryPayload,
		customTabs: createCustomTabs(),
	},
};
