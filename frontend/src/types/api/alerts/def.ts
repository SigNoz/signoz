export interface AlertDef {
	id: number;
	alert: string;
	description: string;
	severity: string;
	ruleType: string;
	ruleCondition: Record<string, unknown>;
	labels: Labels;
	annotations: Labels;
}

interface Labels {
	[key: string]: string;
}
