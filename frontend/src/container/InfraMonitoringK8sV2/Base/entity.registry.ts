import { K8sCategories } from '../constants';
import { SelectedItemParams } from '../hooks';
import { K8sEntityConfig, K8sEntityData } from './entity.config.types';

import { podEntityConfig } from '../Pods/entity.config';
import { nodeEntityConfig } from '../Nodes/entity.config';
import { clusterEntityConfig } from '../Clusters/entity.config';
import { deploymentEntityConfig } from '../Deployments/entity.config';
import { namespaceEntityConfig } from '../Namespaces/entity.config';
import { jobEntityConfig } from '../Jobs/entity.config';
import { daemonSetEntityConfig } from '../DaemonSets/entity.config';
import { statefulSetEntityConfig } from '../StatefulSets/entity.config';
import { volumeEntityConfig } from '../Volumes/entity.config';

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

export const entityRegistry: Record<string, AnyEntityConfig> = {
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
	return entityRegistry[category];
}
