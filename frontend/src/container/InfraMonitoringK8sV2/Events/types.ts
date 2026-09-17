export interface K8sEventRow {
	key: string;
	id: string;
	timestamp: string;
	body: string;
	severity: string;
	kind: string;
	objectName: string;
	namespace: string;
	reason: string;
	attributes_string?: Record<string, string>;
	resources_string?: Record<string, string>;
}

export interface EventDrillDownTarget {
	category: string;
	params: {
		selectedItem: string;
		clusterName: string | null;
		namespaceName: string | null;
	};
}

export interface K8sEventsTimeRange {
	/** Unix timestamp in seconds — the unit API payload builders expect. */
	startTime: number;
	/** Unix timestamp in seconds — the unit API payload builders expect. */
	endTime: number;
}
