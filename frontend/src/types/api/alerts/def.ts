import { ICompositeMetricQuery } from 'types/api/alerts/compositeQuery';

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
	compositeMetricQuery: ICompositeMetricQuery;
	op?: string | undefined;
	target?: number | undefined;
	matchType?: string | undefined;
}

export interface Labels {
	[key: string]: string;
}
