import { AlertLabelsProps } from 'pages/AlertDetails/AlertHeader/AlertLabels/AlertLabels';
import { ICompositeMetricQuery } from 'types/api/alerts/compositeQuery';

// default match type for threshold
export const defaultMatchType = '1';

// default eval window
export const defaultEvalWindow = '5m0s';

export const defaultFrequency = '1m0s';

// default compare op: above
export const defaultCompareOp = '1';

export const defaultAlgorithm = 'standard';

export const defaultSeasonality = 'hourly';

export interface AlertDef {
	id?: number;
	alertType?: string;
	alert: string;
	ruleType?: string;
	frequency?: string;
	condition: RuleCondition;
	labels?: Labels;
	annotations?: Labels;
	evalWindow?: string;
	source?: string;
	disabled?: boolean;
	preferredChannels?: string[];
	broadcastToAll?: boolean;
	version?: string;
}

export interface RuleCondition {
	compositeQuery: ICompositeMetricQuery;
	op?: string;
	target?: number;
	matchType?: string;
	targetUnit?: string;
	selectedQueryName?: string;
	alertOnAbsent?: boolean | undefined;
	absentFor?: number | undefined;
	requireMinPoints?: boolean | undefined;
	requiredNumPoints?: number | undefined;
	algorithm?: string;
	seasonality?: string;
}
export interface Labels {
	[key: string]: string;
}

export interface AlertRuleStats {
	totalCurrentTriggers: number;
	totalPastTriggers: number;
	currentTriggersSeries: CurrentTriggersSeries;
	pastTriggersSeries: CurrentTriggersSeries | null;
	currentAvgResolutionTime: number;
	pastAvgResolutionTime: number;
	currentAvgResolutionTimeSeries: CurrentTriggersSeries;
	pastAvgResolutionTimeSeries: any | null;
}

interface CurrentTriggersSeries {
	labels: Labels;
	labelsArray: any | null;
	values: StatsTimeSeriesItem[];
}

export interface StatsTimeSeriesItem {
	timestamp: number;
	value: string;
}

export type AlertRuleStatsPayload = {
	data: AlertRuleStats;
};

export interface AlertRuleTopContributors {
	fingerprint: number;
	labels: Labels;
	count: number;
	relatedLogsLink: string;
	relatedTracesLink: string;
}
export type AlertRuleTopContributorsPayload = {
	data: AlertRuleTopContributors[];
};

export interface AlertRuleTimelineTableResponse {
	ruleID: string;
	ruleName: string;
	overallState: string;
	overallStateChanged: boolean;
	state: string;
	stateChanged: boolean;
	unixMilli: number;
	labels: Labels;
	fingerprint: number;
	value: number;
	relatedTracesLink: string;
	relatedLogsLink: string;
}
export type AlertRuleTimelineTableResponsePayload = {
	data: {
		items: AlertRuleTimelineTableResponse[];
		total: number;
		labels: AlertLabelsProps['labels'];
	};
};
type AlertState = 'firing' | 'normal' | 'no-data' | 'muted';

export interface AlertRuleTimelineGraphResponse {
	start: number;
	end: number;
	state: AlertState;
}
export type AlertRuleTimelineGraphResponsePayload = {
	data: AlertRuleTimelineGraphResponse[];
};
