import { CompositeMetricQuery } from 'types/api/metrics/compositeQuery';

export interface AlertDef {
	id: number;
	alert: string;
	description: string;
	severity: string;
	ruleType: string;
	ruleCondition: RuleCondition;
	labels: Labels;
	annotations: Labels;
}

interface RuleCondition {
	compositeMetricQuery: CompositeMetricQuery;
	op: string;
	target: number;
	matchType: string;
}

interface Labels {
	[key: string]: string;
}
