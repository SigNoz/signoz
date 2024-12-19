export const VIEW_TYPES = {
	OVERVIEW: 'OVERVIEW',
	JSON: 'JSON',
	CONTEXT: 'CONTEXT',
	INFRAMETRICS: 'INFRAMETRICS',
} as const;

export type VIEWS = typeof VIEW_TYPES[keyof typeof VIEW_TYPES];

export const RESOURCE_KEYS = {
	CLUSTER_NAME: 'k8s.cluster.name',
	POD_NAME: 'k8s.pod.name',
	NODE_NAME: 'k8s.node.name',
	HOST_NAME: 'host.name',
} as const;
