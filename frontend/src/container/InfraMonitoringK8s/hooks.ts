/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { VIEWS } from 'components/HostMetricsDetail/constants';
import {
	parseAsInteger,
	parseAsJson,
	parseAsString,
	useQueryState,
} from 'nuqs';
import {
	IBuilderQuery,
	TagFilter,
} from 'types/api/queryBuilder/queryBuilderData';
import { parseAsJsonNoValidate } from 'utils/nuqsParsers';

import { INFRA_MONITORING_K8S_PARAMS_KEYS, K8sCategories } from './constants';
import { orderBySchema } from './schemas';

const defaultFilters: IBuilderQuery['filters'] = { items: [], op: 'and' };

export const useInfraMonitoringCurrentPage = () =>
	useQueryState(
		INFRA_MONITORING_K8S_PARAMS_KEYS.CURRENT_PAGE,
		parseAsInteger.withDefault(1),
	);

export const useInfraMonitoringOrderBy = () =>
	useQueryState(
		INFRA_MONITORING_K8S_PARAMS_KEYS.ORDER_BY,
		parseAsJson(orderBySchema),
	);

export const useInfraMonitoringOrderByHosts = () =>
	useQueryState(
		INFRA_MONITORING_K8S_PARAMS_KEYS.ORDER_BY,
		parseAsJson(orderBySchema).withDefault({
			columnName: 'cpu',
			order: 'desc',
		}),
	);

export const useInfraMonitoringGroupBy = () =>
	useQueryState(
		INFRA_MONITORING_K8S_PARAMS_KEYS.GROUP_BY,
		parseAsJsonNoValidate<IBuilderQuery['groupBy']>().withDefault([]),
	);

export const useInfraMonitoringView = () =>
	useQueryState(
		INFRA_MONITORING_K8S_PARAMS_KEYS.VIEW,
		parseAsString.withDefault(VIEWS.METRICS),
	);

export const useInfraMonitoringLogFilters = () =>
	useQueryState(
		INFRA_MONITORING_K8S_PARAMS_KEYS.LOG_FILTERS,
		parseAsJsonNoValidate<IBuilderQuery['filters']>(),
	);

export const useInfraMonitoringTracesFilters = () =>
	useQueryState(
		INFRA_MONITORING_K8S_PARAMS_KEYS.TRACES_FILTERS,
		parseAsJsonNoValidate<IBuilderQuery['filters']>(),
	);

export const useInfraMonitoringEventsFilters = () =>
	useQueryState(
		INFRA_MONITORING_K8S_PARAMS_KEYS.EVENTS_FILTERS,
		parseAsJsonNoValidate<IBuilderQuery['filters']>(),
	);

export const useInfraMonitoringCategory = () =>
	useQueryState(
		INFRA_MONITORING_K8S_PARAMS_KEYS.CATEGORY,
		parseAsString.withDefault(K8sCategories.PODS),
	);

export const useInfraMonitoringFilters = () =>
	useQueryState(
		INFRA_MONITORING_K8S_PARAMS_KEYS.FILTERS,
		parseAsString.withDefault(''),
	);

export const useInfraMonitoringFiltersK8s = () =>
	useQueryState(
		INFRA_MONITORING_K8S_PARAMS_KEYS.FILTERS,
		parseAsJsonNoValidate<TagFilter>(),
	);

export const useInfraMonitoringFiltersHosts = () =>
	useQueryState(
		INFRA_MONITORING_K8S_PARAMS_KEYS.FILTERS,
		parseAsJsonNoValidate<IBuilderQuery['filters']>().withDefault(defaultFilters),
	);

export const useInfraMonitoringClusterName = () =>
	useQueryState(
		INFRA_MONITORING_K8S_PARAMS_KEYS.CLUSTER_NAME,
		parseAsString.withDefault(''),
	);

export const useInfraMonitoringDaemonSetUID = () =>
	useQueryState(INFRA_MONITORING_K8S_PARAMS_KEYS.DAEMONSET_UID, parseAsString);

export const useInfraMonitoringDeploymentUID = () =>
	useQueryState(INFRA_MONITORING_K8S_PARAMS_KEYS.DEPLOYMENT_UID, parseAsString);

export const useInfraMonitoringJobUID = () =>
	useQueryState(INFRA_MONITORING_K8S_PARAMS_KEYS.JOB_UID, parseAsString);

export const useInfraMonitoringNamespaceUID = () =>
	useQueryState(INFRA_MONITORING_K8S_PARAMS_KEYS.NAMESPACE_UID, parseAsString);

export const useInfraMonitoringNodeUID = () =>
	useQueryState(INFRA_MONITORING_K8S_PARAMS_KEYS.NODE_UID, parseAsString);

export const useInfraMonitoringPodUID = () =>
	useQueryState(INFRA_MONITORING_K8S_PARAMS_KEYS.POD_UID, parseAsString);

export const useInfraMonitoringStatefulSetUID = () =>
	useQueryState(INFRA_MONITORING_K8S_PARAMS_KEYS.STATEFULSET_UID, parseAsString);

export const useInfraMonitoringVolumeUID = () =>
	useQueryState(INFRA_MONITORING_K8S_PARAMS_KEYS.VOLUME_UID, parseAsString);
