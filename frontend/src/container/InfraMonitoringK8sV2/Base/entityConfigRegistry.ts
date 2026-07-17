import { K8sCategories } from '../constants';
import { SelectedItemParams } from '../hooks';
import { K8sEntityConfig, K8sEntityData } from './entityConfig.types';

import { podEntityConfig } from '../Pods/entityConfig';
import { nodeEntityConfig } from '../Nodes/entityConfig';
import { clusterEntityConfig } from '../Clusters/entityConfig';
import { deploymentEntityConfig } from '../Deployments/entityConfig';
import { namespaceEntityConfig } from '../Namespaces/entityConfig';
import { jobEntityConfig } from '../Jobs/entityConfig';
import { daemonSetEntityConfig } from '../DaemonSets/entityConfig';
import { statefulSetEntityConfig } from '../StatefulSets/entityConfig';
import { volumeEntityConfig } from '../Volumes/entityConfig';

type AnyEntityConfig = K8sEntityConfig<
	K8sEntityData,
	string | SelectedItemParams
>;

function registerConfig<
	T extends K8sEntityData,
	TItemKey extends string | SelectedItemParams,
>(config: K8sEntityConfig<T, TItemKey>): AnyEntityConfig {
	return config as unknown as AnyEntityConfig;
}

export const entityConfigRegistry: Record<string, AnyEntityConfig> = {
	[K8sCategories.PODS]: registerConfig(podEntityConfig),
	[K8sCategories.NODES]: registerConfig(nodeEntityConfig),
	[K8sCategories.CLUSTERS]: registerConfig(clusterEntityConfig),
	[K8sCategories.DEPLOYMENTS]: registerConfig(deploymentEntityConfig),
	[K8sCategories.NAMESPACES]: registerConfig(namespaceEntityConfig),
	[K8sCategories.JOBS]: registerConfig(jobEntityConfig),
	[K8sCategories.DAEMONSETS]: registerConfig(daemonSetEntityConfig),
	[K8sCategories.STATEFULSETS]: registerConfig(statefulSetEntityConfig),
	[K8sCategories.VOLUMES]: registerConfig(volumeEntityConfig),
};

export function getEntityConfig(category: string): AnyEntityConfig | undefined {
	return entityConfigRegistry[category];
}
