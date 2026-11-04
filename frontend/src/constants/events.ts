export enum Events {
	UPDATE_GRAPH_VISIBILITY_STATE = 'UPDATE_GRAPH_VISIBILITY_STATE',
	UPDATE_GRAPH_MANAGER_TABLE = 'UPDATE_GRAPH_MANAGER_TABLE',
	TABLE_COLUMNS_DATA = 'TABLE_COLUMNS_DATA',
	SLOW_API_WARNING = 'SLOW_API_WARNING',
	TOOLTIP_PINNED = 'TOOLTIP_PINNED',
	TOOLTIP_UNPINNED = 'TOOLTIP_UNPINNED',
	TOOLTIP_CONTENT_SCROLLED = 'TOOLTIP_CONTENT_SCROLLED',
	TOOLTIP_SYNC_MODE_CHANGED = 'TOOLTIP_SYNC_MODE_CHANGED',
}

export enum InfraMonitoringEvents {
	ItemClicked = 'Infra Monitoring: item clicked',
	HostEntity = 'host',
	K8sEntity = 'k8s',
	ListPage = 'list',
	TracesView = 'traces',
	Cluster = 'cluster',
	Container = 'container',
	DaemonSet = 'daemonSet',
	Deployment = 'deployment',
	Job = 'job',
	Namespace = 'namespace',
	Node = 'node',
	Pod = 'pod',
	StatefulSet = 'statefulSet',
	Volumes = 'volumes',
}
