export enum VIEWS {
	METRICS = 'metrics',
	LOGS = 'logs',
	TRACES = 'traces',
	EVENTS = 'events',
}

export const VIEW_TYPES = {
	METRICS: VIEWS.METRICS,
	LOGS: VIEWS.LOGS,
	TRACES: VIEWS.TRACES,
	EVENTS: VIEWS.EVENTS,
};

export const QUERY_KEYS = {
	K8S_OBJECT_KIND: 'k8s.object.kind',
	K8S_OBJECT_NAME: 'k8s.object.name',
	K8S_NODE_NAME: 'k8s.node.name',
	K8S_CLUSTER_NAME: 'k8s.cluster.name',
};
