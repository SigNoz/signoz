import { CompositeMetricQuery } from 'types/api/metrics/compositeQuery';

export interface AlertDef {
	id?: number;
	alert?: string;
	ruleType?: string;
	condition: RuleCondition;
	labels?: Labels;
	annotations?: Labels;
	evalWindow?: string;
}

export interface RuleCondition {
	compositeMetricQuery: CompositeMetricQuery;
	op?: string | undefined;
	target?: number | undefined;
	matchType?: string | undefined;
}

export interface Labels {
	[key: string]: string;
}
