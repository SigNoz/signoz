export interface FilterValue {
	value: string;
}

export interface AlertStatsBase {
	total: number;
	bySeverity: Record<string, number>;
}

export interface AlertWithLabels {
	labels?: Record<string, string>;
}
