/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { VIEWS } from 'components/HostMetricsDetail/constants';
import {
	Options,
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
const defaultNuqsOptions: Options = {
	history: 'push',
};

export const useInfraMonitoringCurrentPage = () =>
	useQueryState(
		INFRA_MONITORING_K8S_PARAMS_KEYS.CURRENT_PAGE,
		parseAsInteger.withDefault(1).withOptions(defaultNuqsOptions),
	);

export const useInfraMonitoringOrderBy = () =>
	useQueryState(
		INFRA_MONITORING_K8S_PARAMS_KEYS.ORDER_BY,
		parseAsJson(orderBySchema).withOptions(defaultNuqsOptions),
	);

export const useInfraMonitoringOrderByHosts = () =>
	useQueryState(
		INFRA_MONITORING_K8S_PARAMS_KEYS.ORDER_BY,
		parseAsJson(orderBySchema)
			.withDefault({
				columnName: 'cpu',
				order: 'desc',
			})
			.withOptions(defaultNuqsOptions),
	);

export const useInfraMonitoringGroupBy = () =>
	useQueryState(
		INFRA_MONITORING_K8S_PARAMS_KEYS.GROUP_BY,
		parseAsJsonNoValidate<IBuilderQuery['groupBy']>()
			.withDefault([])
			.withOptions(defaultNuqsOptions),
	);

export const useInfraMonitoringView = () =>
	useQueryState(
		INFRA_MONITORING_K8S_PARAMS_KEYS.VIEW,
		parseAsString.withDefault(VIEWS.METRICS).withOptions(defaultNuqsOptions),
	);

export const useInfraMonitoringLogFilters = () =>
	useQueryState(
		INFRA_MONITORING_K8S_PARAMS_KEYS.LOG_FILTERS,
		parseAsJsonNoValidate<IBuilderQuery['filters']>().withOptions(
			defaultNuqsOptions,
		),
	);

export const useInfraMonitoringTracesFilters = () =>
	useQueryState(
		INFRA_MONITORING_K8S_PARAMS_KEYS.TRACES_FILTERS,
		parseAsJsonNoValidate<IBuilderQuery['filters']>().withOptions(
			defaultNuqsOptions,
		),
	);

export const useInfraMonitoringEventsFilters = () =>
	useQueryState(
		INFRA_MONITORING_K8S_PARAMS_KEYS.EVENTS_FILTERS,
		parseAsJsonNoValidate<IBuilderQuery['filters']>().withOptions(
			defaultNuqsOptions,
		),
	);

export const useInfraMonitoringCategory = () =>
	useQueryState(
		INFRA_MONITORING_K8S_PARAMS_KEYS.CATEGORY,
		parseAsString.withDefault(K8sCategories.PODS).withOptions(defaultNuqsOptions),
	);

export const useInfraMonitoringFilters = () =>
	useQueryState(
		INFRA_MONITORING_K8S_PARAMS_KEYS.FILTERS,
		parseAsString.withDefault('').withOptions(defaultNuqsOptions),
	);

export const useInfraMonitoringFiltersK8s = () =>
	useQueryState(
		INFRA_MONITORING_K8S_PARAMS_KEYS.FILTERS,
		parseAsJsonNoValidate<TagFilter>().withOptions(defaultNuqsOptions),
	);

export const useInfraMonitoringFiltersHosts = () =>
	useQueryState(
		INFRA_MONITORING_K8S_PARAMS_KEYS.FILTERS,
		parseAsJsonNoValidate<IBuilderQuery['filters']>()
			.withDefault(defaultFilters)
			.withOptions(defaultNuqsOptions),
	);

export const useInfraMonitoringClusterName = () =>
	useQueryState(
		INFRA_MONITORING_K8S_PARAMS_KEYS.CLUSTER_NAME,
		parseAsString.withDefault('').withOptions(defaultNuqsOptions),
	);

export const useInfraMonitoringDaemonSetUID = () =>
	useQueryState(
		INFRA_MONITORING_K8S_PARAMS_KEYS.DAEMONSET_UID,
		parseAsString.withOptions(defaultNuqsOptions),
	);

export const useInfraMonitoringDeploymentUID = () =>
	useQueryState(
		INFRA_MONITORING_K8S_PARAMS_KEYS.DEPLOYMENT_UID,
		parseAsString.withOptions(defaultNuqsOptions),
	);

export const useInfraMonitoringJobUID = () =>
	useQueryState(
		INFRA_MONITORING_K8S_PARAMS_KEYS.JOB_UID,
		parseAsString.withOptions(defaultNuqsOptions),
	);

export const useInfraMonitoringNamespaceUID = () =>
	useQueryState(
		INFRA_MONITORING_K8S_PARAMS_KEYS.NAMESPACE_UID,
		parseAsString.withOptions(defaultNuqsOptions),
	);

export const useInfraMonitoringNodeUID = () =>
	useQueryState(
		INFRA_MONITORING_K8S_PARAMS_KEYS.NODE_UID,
		parseAsString.withOptions(defaultNuqsOptions),
	);

export const useInfraMonitoringPodUID = () =>
	useQueryState(
		INFRA_MONITORING_K8S_PARAMS_KEYS.POD_UID,
		parseAsString.withOptions(defaultNuqsOptions),
	);

export const useInfraMonitoringStatefulSetUID = () =>
	useQueryState(
		INFRA_MONITORING_K8S_PARAMS_KEYS.STATEFULSET_UID,
		parseAsString.withOptions(defaultNuqsOptions),
	);

export const useInfraMonitoringVolumeUID = () =>
	useQueryState(
		INFRA_MONITORING_K8S_PARAMS_KEYS.VOLUME_UID,
		parseAsString.withOptions(defaultNuqsOptions),
	);
