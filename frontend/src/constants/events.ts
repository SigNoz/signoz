export enum Events {
	UPDATE_GRAPH_VISIBILITY_STATE = 'UPDATE_GRAPH_VISIBILITY_STATE',
	UPDATE_GRAPH_MANAGER_TABLE = 'UPDATE_GRAPH_MANAGER_TABLE',
	TABLE_COLUMNS_DATA = 'TABLE_COLUMNS_DATA',
	SLOW_API_WARNING = 'SLOW_API_WARNING',
}

export enum InfraMonitoringEvents {
	PageVisited = 'Infra Monitoring: page visited',
	PageNumberChanged = 'Infra Monitoring: page number changed',
	GroupByChanged = 'Infra Monitoring: group by changed',
	FilterApplied = 'Infra Monitoring: filter applied',
	ItemClicked = 'Infra Monitoring: item clicked',
	TabChanged = 'Infra Monitoring: tab changed',
	TimeUpdated = 'Infra Monitoring: time updated',
	ExploreClicked = 'Infra Monitoring: explore clicked',
	HostEntity = 'host',
	K8sEntity = 'k8s',
	ListPage = 'list',
	DetailedPage = 'detailed',
	LogsView = 'logs',
	TracesView = 'traces',
	EventsView = 'events',
	QuickFiltersView = 'quick filters',
	MetricsView = 'metrics',
	Total = 'total',
	Cluster = 'cluster',
	DaemonSet = 'daemonSet',
	Deployment = 'deployment',
	Job = 'job',
	Namespace = 'namespace',
	Node = 'node',
	Volume = 'volume',
	Pod = 'pod',
	StatefulSet = 'statefulSet',
	Volumes = 'volumes',
}
