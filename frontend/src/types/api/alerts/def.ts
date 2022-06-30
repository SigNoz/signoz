import { CompositeMetricQuery } from 'types/api/metrics/compositeQuery';

export interface AlertDef {
	id: number;
	alert: string;
	ruleType: string;
	condition: RuleCondition;
	labels: Labels;
	annotations: Labels;
	evalWindow: string;
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
