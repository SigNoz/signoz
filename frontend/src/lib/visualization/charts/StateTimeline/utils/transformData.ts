import type { DashboardtypesThresholdWithLabelDTO } from 'api/generated/services/sigNoz.schemas';
import type { PanelSeries } from 'pages/DashboardPage/DashboardContainer/queryV5/types';

import type {
	SegmentData,
	SwimLaneModel,
	SwimLaneRowData,
	TimeRange,
} from '../types';
import { evaluateThreshold, ThresholdEvalResult } from './evaluateThreshold';

/** Default "No Data" segment colours (light / dark). */
const DEFAULT_COLOR_LIGHT = '#9CA3AF';
const DEFAULT_COLOR_DARK = '#6B7280';

/** A leading gap shorter than this (seconds) is not gap-filled. */
const LEADING_GAP_THRESHOLD_SECONDS = 60;

/** V5 timestamps are epoch ms; the swim-lane model works in epoch seconds. */
function toSeconds(timestampMs: number): number {
	return timestampMs / 1000;
}

/**
 * Builds segments from a series' points. Each segment spans from one point to
 * the next; the last extends to `timeRange.end`. A single point produces one
 * full-width segment. Consecutive same-colour segments are merged so the
 * tooltip reports the true duration a service stayed in a state.
 */
function buildSegments(
	values: PanelSeries['values'],
	timeRange: TimeRange,
	thresholds: DashboardtypesThresholdWithLabelDTO[],
	defaultColor: string,
	leadingGapEnd?: number,
): SegmentData[] {
	if (values.length === 0) {
		return [];
	}

	const segments: SegmentData[] = [];

	// Grey "No Data" segment for a leading gap before the first data point.
	if (leadingGapEnd && leadingGapEnd > timeRange.start) {
		segments.push({
			startTime: timeRange.start,
			endTime: leadingGapEnd,
			value: null,
			color: defaultColor,
			thresholdLabel: 'No Data',
		});
	}

	for (let i = 0; i < values.length; i++) {
		const startTime = toSeconds(values[i].timestamp);
		// Points inside the leading gap are already covered by the grey segment.
		if (leadingGapEnd && startTime < leadingGapEnd) {
			continue;
		}

		const numericValue = values[i].value;
		const evalResult: ThresholdEvalResult = evaluateThreshold(
			numericValue,
			thresholds,
			defaultColor,
		);
		const endTime =
			i < values.length - 1 ? toSeconds(values[i + 1].timestamp) : timeRange.end;

		segments.push({
			startTime,
			endTime,
			value: numericValue,
			color: evalResult.color,
			thresholdLabel: numericValue === null ? 'No Data' : evalResult.label,
		});
	}

	return mergeConsecutiveSegments(segments);
}

/** Merges consecutive segments sharing a colour into a single wider segment. */
function mergeConsecutiveSegments(segments: SegmentData[]): SegmentData[] {
	if (segments.length <= 1) {
		return segments;
	}

	const merged: SegmentData[] = [segments[0]];
	for (let i = 1; i < segments.length; i++) {
		const current = segments[i];
		const last = merged[merged.length - 1];
		if (current.color === last.color) {
			last.endTime = current.endTime;
		} else {
			merged.push({ ...current });
		}
	}
	return merged;
}

/**
 * Transforms flattened V5 `PanelSeries` into a `SwimLaneModel`.
 *
 * Pipeline: one row per series → resolve label → build threshold-coloured
 * segments → sort rows alphabetically. `timeRange` is in epoch seconds
 * (`getPanelTimeRange`); series timestamps are epoch ms and normalised here.
 *
 * Edge cases: empty series → no row; single point → full-width segment;
 * null/NaN values → default grey.
 */
export function transformSeriesToSwimLanes(
	series: PanelSeries[],
	timeRange: TimeRange,
	thresholds: DashboardtypesThresholdWithLabelDTO[],
	isDarkMode: boolean,
): SwimLaneModel {
	const defaultColor = isDarkMode ? DEFAULT_COLOR_DARK : DEFAULT_COLOR_LIGHT;

	// Earliest data point across all series; a large gap before it (query window
	// starting before data collection) is rendered as a leading "No Data" band.
	let earliestDataTimestamp = timeRange.end;
	for (const s of series) {
		if (s.values.length === 0) {
			continue;
		}
		const firstTs = toSeconds(s.values[0].timestamp);
		if (firstTs < earliestDataTimestamp) {
			earliestDataTimestamp = firstTs;
		}
	}
	const hasLeadingGap =
		earliestDataTimestamp - timeRange.start > LEADING_GAP_THRESHOLD_SECONDS;

	const rows: SwimLaneRowData[] = [];
	for (const s of series) {
		if (s.values.length === 0) {
			continue;
		}
		rows.push({
			label: s.legend || s.queryName,
			segments: buildSegments(
				s.values,
				timeRange,
				thresholds,
				defaultColor,
				hasLeadingGap ? earliestDataTimestamp : undefined,
			),
			seriesLabels: { ...s.labels },
		});
	}

	rows.sort((a, b) =>
		a.label.toLowerCase().localeCompare(b.label.toLowerCase()),
	);

	return { rows, timeRange };
}
