import { useCallback, useMemo } from 'react';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import { listDeployments } from 'api/generated/services/inframonitoring';
import { RenderErrorResponseDTO } from 'api/generated/services/sigNoz.schemas';
import { AxiosError } from 'axios';
import {
	InframonitoringtypesDeploymentRecordDTO,
	InframonitoringtypesResponseTypeDTO,
	Querybuildertypesv5OrderDirectionDTO,
} from 'api/generated/services/sigNoz.schemas';
import { InfraMonitoringEvents } from 'constants/events';
import APIError from 'types/api/error';

import K8sBaseDetails, { K8sDetailsFilters } from '../Base/K8sBaseDetails';
import { K8sBaseList } from '../Base/K8sBaseList';
import { K8sBaseFilters } from '../Base/types';
import { InfraMonitoringEntity } from '../constants';
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
import { createPodMetricsTab } from 'container/InfraMonitoringK8sV2/EntityDetailsUtils/createPodMetricsTab';

function K8sDeploymentsList({
	controlListPrefix,
}: {
	controlListPrefix?: React.ReactNode;
}): JSX.Element {
	const fetchListData = useCallback(
		async (filters: K8sBaseFilters, signal?: AbortSignal) => {
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
		},
		[],
	);

	const fetchEntityData = useCallback(
		async (
			filters: K8sDetailsFilters,
			signal?: AbortSignal,
		): Promise<{
			data: InframonitoringtypesDeploymentRecordDTO | null;
			error?: APIError | null;
		}> => {
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
		},
		[],
	);

	const customTabs = useMemo(
		() => [
			createPodMetricsTab<InframonitoringtypesDeploymentRecordDTO>({
				getQueryPayload: getDeploymentPodMetricsQueryPayload,
				category: InfraMonitoringEntity.DEPLOYMENTS,
				queryKey: 'deploymentPodMetrics',
			}),
		],
		[],
	);

	return (
		<>
			<K8sBaseList<InframonitoringtypesDeploymentRecordDTO, SelectedItemParams>
				controlListPrefix={controlListPrefix}
				entity={InfraMonitoringEntity.DEPLOYMENTS}
				tableColumns={k8sDeploymentsColumnsConfig}
				fetchListData={fetchListData}
				getRowKey={getK8sDeploymentRowKey}
				getItemKey={getK8sDeploymentItemKey}
				eventCategory={InfraMonitoringEvents.Deployment}
			/>

			<K8sBaseDetails<InframonitoringtypesDeploymentRecordDTO>
				category={InfraMonitoringEntity.DEPLOYMENTS}
				eventCategory={InfraMonitoringEvents.Deployment}
				getSelectedItemExpression={k8sDeploymentGetSelectedItemExpression}
				fetchEntityData={fetchEntityData}
				getEntityName={k8sDeploymentGetEntityName}
				getInitialLogTracesExpression={k8sDeploymentInitialLogTracesExpression}
				getInitialEventsExpression={k8sDeploymentInitialEventsExpression}
				metadataConfig={k8sDeploymentDetailsMetadataConfig}
				entityWidgetInfo={deploymentWidgetInfo}
				getEntityQueryPayload={getDeploymentMetricsQueryPayload}
				queryKeyPrefix="deployment"
				customTabs={customTabs}
			/>
		</>
	);
}

export default K8sDeploymentsList;
