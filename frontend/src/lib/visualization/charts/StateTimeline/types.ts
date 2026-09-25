/** Swim-lane model types shared by the StateTimeline chart and its utils. */

/** Panel time window in epoch SECONDS (matches `getPanelTimeRange`). */
export interface TimeRange {
	start: number;
	end: number;
}

/** One coloured segment of a swim-lane row. Times are epoch seconds. */
export interface SegmentData {
	startTime: number;
	endTime: number;
	value: number | null;
	/** Hex colour from threshold evaluation. */
	color: string;
	/** Optional label from the matching threshold rule. */
	thresholdLabel?: string;
}

/** One service row: a resolved label and its ordered segments. */
export interface SwimLaneRowData {
	label: string;
	segments: SegmentData[];
	/** Original series labels, kept for context links. */
	seriesLabels: Record<string, string>;
}

/** The full model rendered by the StateTimeline chart. */
export interface SwimLaneModel {
	rows: SwimLaneRowData[];
	timeRange: TimeRange;
}

/** One tick on the bottom time axis. */
export interface TickMark {
	/** 0-1 fraction of total width. */
	position: number;
	label: string;
	/** Epoch seconds. */
	timestamp: number;
}
