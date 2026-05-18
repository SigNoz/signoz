import React, { useCallback } from 'react';
import { InfraMonitoringEvents } from 'constants/events';
import { FeatureKeys } from 'constants/features';
import { useAppContext } from 'providers/App/App';

import K8sBaseDetails, { K8sDetailsFilters } from '../Base/K8sBaseDetails';
import { K8sBaseList } from '../Base/K8sBaseList';
import { K8sBaseFilters } from '../Base/types';
import { InfraMonitoringEntity } from '../constants';
import { getK8sDeploymentsList, K8sDeploymentsData } from './api';
import {
	deploymentWidgetInfo,
	getDeploymentMetricsQueryPayload,
	k8sDeploymentDetailsMetadataConfig,
	k8sDeploymentGetEntityName,
	k8sDeploymentGetSelectedItemFilters,
	k8sDeploymentInitialEventsFilter,
	k8sDeploymentInitialFilters,
	k8sDeploymentInitialLogTracesFilter,
} from './constants';
import {
	getK8sDeploymentItemKey,
	getK8sDeploymentRowKey,
	k8sDeploymentsColumnsConfig,
} from './table.config';

function K8sDeploymentsList({
	controlListPrefix,
}: {
	controlListPrefix?: React.ReactNode;
}): JSX.Element {
	const { featureFlags } = useAppContext();
	const dotMetricsEnabled =
		featureFlags?.find((flag) => flag.name === FeatureKeys.DOT_METRICS_ENABLED)
			?.active || false;

	const fetchListData = useCallback(
		async (filters: K8sBaseFilters, signal?: AbortSignal) => {
			filters.orderBy ||= {
				columnName: 'cpu',
				order: 'desc',
			};

			const response = await getK8sDeploymentsList(
				filters,
				signal,
				undefined,
				dotMetricsEnabled,
			);

			return {
				data: response.payload?.data.records || [],
				total: response.payload?.data.total || 0,
				error: response.error,
				rawData: response.payload?.data,
			};
		},
		[dotMetricsEnabled],
	);

	const fetchEntityData = useCallback(
		async (
			filters: K8sDetailsFilters,
			signal?: AbortSignal,
		): Promise<{ data: K8sDeploymentsData | null; error?: string | null }> => {
			const response = await getK8sDeploymentsList(
				{
					filters: filters.filters,
					start: filters.start,
					end: filters.end,
					limit: 1,
					offset: 0,
				},
				signal,
				undefined,
				dotMetricsEnabled,
			);

			const records = response.payload?.data.records || [];

			return {
				data: records.length > 0 ? records[0] : null,
				error: response.error,
			};
		},
		[dotMetricsEnabled],
	);

	return (
		<>
			<K8sBaseList<K8sDeploymentsData>
				controlListPrefix={controlListPrefix}
				entity={InfraMonitoringEntity.DEPLOYMENTS}
				tableColumns={k8sDeploymentsColumnsConfig}
				fetchListData={fetchListData}
				getRowKey={getK8sDeploymentRowKey}
				getItemKey={getK8sDeploymentItemKey}
				eventCategory={InfraMonitoringEvents.Deployment}
			/>

			<K8sBaseDetails<K8sDeploymentsData>
				category={InfraMonitoringEntity.DEPLOYMENTS}
				eventCategory={InfraMonitoringEvents.Deployment}
				getSelectedItemFilters={k8sDeploymentGetSelectedItemFilters}
				fetchEntityData={fetchEntityData}
				getEntityName={k8sDeploymentGetEntityName}
				getInitialLogTracesFilters={k8sDeploymentInitialLogTracesFilter}
				getInitialEventsFilters={k8sDeploymentInitialEventsFilter}
				primaryFilterKeys={k8sDeploymentInitialFilters}
				metadataConfig={k8sDeploymentDetailsMetadataConfig}
				entityWidgetInfo={deploymentWidgetInfo}
				getEntityQueryPayload={getDeploymentMetricsQueryPayload}
				queryKeyPrefix="deployment"
			/>
		</>
	);
}

export default K8sDeploymentsList;
