/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import {
	RuletypesAlertStateDTO,
	TelemetrytypesFieldContextDTO,
	TelemetrytypesSignalDTO,
	type GetRuleHistoryFilterKeys200,
	type GetRuleHistoryFilterValues200,
	type GetRuleHistoryOverallStatus200,
	type GetRuleHistoryStats200,
	type GetRuleHistoryTimeline200,
	type GetRuleHistoryTopContributors200,
	type Querybuildertypesv5LabelDTO,
	type Querybuildertypesv5TimeSeriesDTO,
	type RulestatehistorytypesGettableRuleStateHistoryDTO,
} from 'api/generated/services/sigNoz.schemas';

const MINUTE = 60 * 1000;

/** The labels a rule's history is broken down by, both in the table and the filters. */
export const HISTORY_LABEL_VALUES: Record<string, string[]> = {
	'service.name': ['checkout', 'payments', 'auth', 'search'],
	'deployment.environment': ['prod', 'staging'],
	'host.name': ['ip-10-0-1-14', 'ip-10-0-2-31', 'ip-10-0-3-77'],
	severity: ['critical', 'error', 'warning'],
};

const HISTORY_LABEL_KEYS = Object.keys(HISTORY_LABEL_VALUES);

const labelsFor = (index: number): Querybuildertypesv5LabelDTO[] =>
	HISTORY_LABEL_KEYS.map((name) => {
		const values = HISTORY_LABEL_VALUES[name];

		return { key: { name }, value: values[index % values.length] };
	});

/** Points spread evenly across the window, derived from the index so a re-render redraws the same line. */
const series = (
	start: number,
	end: number,
	points: number,
	base: number,
	amplitude: number,
): Querybuildertypesv5TimeSeriesDTO => {
	const step = (end - start) / Math.max(points - 1, 1);

	return {
		labels: [],
		values: Array.from({ length: points }, (_unused, index) => ({
			timestamp: Math.round(start + index * step),
			value: Math.max(
				0,
				Math.round(base + amplitude * Math.sin(index / 2.5) + amplitude * 0.4),
			),
		})),
	};
};

export interface HistoryWindow {
	start: number;
	end: number;
}

/** `currentAvgResolutionTime` is seconds: `formatTime` picks the unit it prints. */
export const ruleHistoryStatsResponse = (
	{ start, end }: HistoryWindow,
	triggers: number,
	avgResolutionMinutes: number,
): GetRuleHistoryStats200 => {
	const current = avgResolutionMinutes * 60;
	const past = Math.round(current * 1.35);

	return {
		status: 'success',
		data: {
			totalCurrentTriggers: triggers,
			totalPastTriggers: Math.round(triggers * 0.7),
			currentAvgResolutionTime: current,
			pastAvgResolutionTime: past,
			currentTriggersSeries: series(start, end, 24, triggers / 12, triggers / 8),
			pastTriggersSeries: series(start, end, 24, triggers / 16, triggers / 10),
			currentAvgResolutionTimeSeries: series(start, end, 24, current, current / 3),
			pastAvgResolutionTimeSeries: series(start, end, 24, past, past / 3),
		},
	};
};

export const TOP_CONTRIBUTOR_MAX = 8;

export const ruleHistoryTopContributorsResponse = (
	count: number,
	totalTriggers: number,
): GetRuleHistoryTopContributors200 => ({
	status: 'success',
	data: Array.from({ length: count }, (_unused, index) => ({
		fingerprint: 100_000 + index,
		count: Math.max(1, Math.round(totalTriggers / (index + 2))),
		labels: labelsFor(index),
		relatedLogsLink: 'http://localhost/logs/logs-explorer',
		relatedTracesLink: 'http://localhost/traces-explorer',
	})),
});

/**
 * The graph draws one band per window, so the windows have to tile the range
 * end to end: a gap reads as a hole in the timeline rather than a quiet period.
 */
export const ruleHistoryOverallStatusResponse = (
	{ start, end }: HistoryWindow,
	windows: number,
): GetRuleHistoryOverallStatus200 => {
	const step = (end - start) / Math.max(windows, 1);

	return {
		status: 'success',
		data: Array.from({ length: windows }, (_unused, index) => ({
			start: Math.round(start + index * step),
			end: Math.round(start + (index + 1) * step),
			state:
				index % 5 === 0
					? RuletypesAlertStateDTO.firing
					: RuletypesAlertStateDTO.inactive,
		})),
	};
};

export const TIMELINE_MAX = 40;

export interface TimelineShape {
	total: number;
	limit: number;
	end: number;
	state?: RuletypesAlertStateDTO;
	ruleId: string;
	ruleName: string;
}

const timelineItem = (
	index: number,
	shape: TimelineShape,
): RulestatehistorytypesGettableRuleStateHistoryDTO => {
	const state =
		shape.state ??
		(index % 2 === 0
			? RuletypesAlertStateDTO.firing
			: RuletypesAlertStateDTO.inactive);

	return {
		ruleId: shape.ruleId,
		ruleName: shape.ruleName,
		fingerprint: 100_000 + (index % TOP_CONTRIBUTOR_MAX),
		labels: labelsFor(index),
		overallState: state,
		overallStateChanged: index % 3 === 0,
		state,
		stateChanged: index % 2 === 0,
		unixMilli: shape.end - index * 7 * MINUTE,
		value: Number((60 + (index % 9) * 4.5).toFixed(2)),
		relatedLogsLink: 'http://localhost/logs/logs-explorer',
		relatedTracesLink: 'http://localhost/traces-explorer',
	};
};

export const ruleHistoryTimelineResponse = (
	shape: TimelineShape,
): GetRuleHistoryTimeline200 => {
	const size = Math.min(shape.limit, shape.total);

	return {
		status: 'success',
		data: {
			total: shape.total,
			nextCursor: shape.total > size ? 'next-page-cursor' : '',
			items: Array.from({ length: size }, (_unused, index) =>
				timelineItem(index, shape),
			),
		},
	};
};

export const ruleHistoryFilterKeysResponse =
	(): GetRuleHistoryFilterKeys200 => ({
		status: 'success',
		data: {
			complete: true,
			keys: Object.fromEntries(
				HISTORY_LABEL_KEYS.map((name) => [
					name,
					[
						{
							name,
							signal: TelemetrytypesSignalDTO.traces,
							fieldContext: TelemetrytypesFieldContextDTO.resource,
						},
					],
				]),
			),
		},
	});

export const ruleHistoryFilterValuesResponse = (
	key: string,
): GetRuleHistoryFilterValues200 => {
	const values = HISTORY_LABEL_VALUES[key] ?? [];

	return {
		status: 'success',
		data: {
			complete: true,
			values: { stringValues: values, relatedValues: values },
		},
	};
};
