import type { Meta, StoryObj } from '@storybook/react-vite';
import TimezoneProvider from 'providers/Timezone';

import type { SegmentData, SwimLaneModel } from './types';
import StateTimelinePanel from './StateTimelinePanel';

// Colours matching the proposal (green = pass, yellow = intermittent, red = fail).
const GREEN = '#73BF69';
const YELLOW = '#FADE2A';
const RED = '#F2495C';

// A 6-hour window, in epoch seconds (the model works in seconds).
const NOW = Math.floor(Date.now() / 1000);
const WINDOW_SECONDS = 6 * 3600;
const START = NOW - WINDOW_SECONDS;

function colourFor(value: number): { color: string; label: string } {
	if (value >= 0.999) {
		return { color: GREEN, label: 'Passed' };
	}
	if (value <= 0.001) {
		return { color: RED, label: 'Failed' };
	}
	return { color: YELLOW, label: 'Intermittent' };
}

/**
 * Builds a row of segments from a list of state values spread evenly across the
 * window. Consecutive same-state values are merged into one segment, mirroring
 * what `transformSeriesToSwimLanes` produces.
 */
function buildRow(
	label: string,
	values: number[],
): {
	label: string;
	segments: SegmentData[];
	seriesLabels: Record<string, string>;
} {
	const step = WINDOW_SECONDS / values.length;
	const segments: SegmentData[] = [];

	values.forEach((value, index) => {
		const startTime = START + index * step;
		const endTime =
			index === values.length - 1
				? START + WINDOW_SECONDS
				: START + (index + 1) * step;
		const { color, label: thresholdLabel } = colourFor(value);
		const last = segments[segments.length - 1];
		if (last && last.color === color) {
			last.endTime = endTime;
		} else {
			segments.push({ startTime, endTime, value, color, thresholdLabel });
		}
	});

	return { label, segments, seriesLabels: { service: label } };
}

/** Deterministic pseudo-random state sequence so snapshots are stable. */
function sequence(seed: number, length: number): number[] {
	const out: number[] = [];
	let s = seed;
	for (let i = 0; i < length; i++) {
		s = (s * 1103515245 + 12345) & 0x7fffffff;
		const r = s / 0x7fffffff;
		// Mostly passing, occasional intermittent/failed.
		if (r > 0.9) {
			out.push(0);
		} else if (r > 0.8) {
			out.push(0.5);
		} else {
			out.push(1);
		}
	}
	return out;
}

const SERVICES = [
	'auth-service',
	'billing-api',
	'checkout',
	'inventory',
	'notifications',
	'payments-gateway',
	'search-indexer',
	'user-profile',
];

const swimLaneModel: SwimLaneModel = {
	timeRange: { start: START, end: START + WINDOW_SECONDS },
	rows: SERVICES.map((name, i) => buildRow(name, sequence(i + 1, 48))),
};

const meta = {
	title: 'Visualization/StateTimelinePanel',
	component: StateTimelinePanel,
	decorators: [
		(Story): JSX.Element => (
			<TimezoneProvider>
				<div style={{ width: 900, height: 360, padding: 16 }}>
					<Story />
				</div>
			</TimezoneProvider>
		),
	],
	args: {
		swimLaneModel,
		width: 868,
		height: 328,
		isDarkMode: true,
	},
} satisfies Meta<typeof StateTimelinePanel>;

export default meta;

type Story = StoryObj<typeof StateTimelinePanel>;

/** Eight services, mostly healthy with occasional failures over a 6h window. */
export const Default: Story = {};

/** A single service — the simplest swim lane. */
export const SingleService: Story = {
	args: {
		swimLaneModel: {
			timeRange: { start: START, end: START + WINDOW_SECONDS },
			rows: [buildRow('auth-service', sequence(1, 48))],
		},
	},
};

/** Clean binary pass/fail with no intermittent state. */
export const BinaryPassFail: Story = {
	args: {
		swimLaneModel: {
			timeRange: { start: START, end: START + WINDOW_SECONDS },
			rows: [
				buildRow(
					'healthy',
					Array.from({ length: 48 }, () => 1),
				),
				buildRow(
					'flapping',
					Array.from({ length: 48 }, (_, i) => (i % 2 === 0 ? 1 : 0)),
				),
				buildRow(
					'down',
					Array.from({ length: 48 }, () => 0),
				),
			],
		},
	},
};

/** A leading "No Data" band: data starts partway into the window. */
export const LeadingNoData: Story = {
	args: {
		swimLaneModel: {
			timeRange: { start: START, end: START + WINDOW_SECONDS },
			rows: [
				{
					label: 'late-starter',
					seriesLabels: { service: 'late-starter' },
					segments: [
						{
							startTime: START,
							endTime: START + WINDOW_SECONDS / 2,
							value: null,
							color: '#6B7280',
							thresholdLabel: 'No Data',
						},
						{
							startTime: START + WINDOW_SECONDS / 2,
							endTime: START + WINDOW_SECONDS,
							value: 1,
							color: GREEN,
							thresholdLabel: 'Passed',
						},
					],
				},
			],
		},
	},
};

/** Many rows to exercise the virtualized list. */
export const ManyServices: Story = {
	args: {
		swimLaneModel: {
			timeRange: { start: START, end: START + WINDOW_SECONDS },
			rows: Array.from({ length: 120 }, (_, i) =>
				buildRow(`service-${String(i + 1).padStart(3, '0')}`, sequence(i + 1, 48)),
			),
		},
	},
};

/** Light theme. */
export const LightTheme: Story = {
	args: {
		isDarkMode: false,
	},
};

// --- Two-month view with many thresholds (thin-segment stress test) ---

const TWO_MONTHS_SECONDS = 60 * 24 * 3600;
const TWO_MONTHS_START = NOW - TWO_MONTHS_SECONDS;

// Six distinct threshold bands, so adjacent points rarely share a colour and
// merging can't collapse them into wide blocks.
const SIX_BANDS = [
	{ min: 5, color: '#F2495C', label: 'Critical' },
	{ min: 4, color: '#FF9830', label: 'Severe' },
	{ min: 3, color: '#FADE2A', label: 'Warning' },
	{ min: 2, color: '#5794F2', label: 'Elevated' },
	{ min: 1, color: '#B877D9', label: 'Notice' },
	{ min: 0, color: '#73BF69', label: 'OK' },
];

function bandFor(value: number): { color: string; label: string } {
	const band =
		SIX_BANDS.find((b) => value >= b.min) ?? SIX_BANDS[SIX_BANDS.length - 1];
	return { color: band.color, label: band.label };
}

/** Builds a dense row (one point per `step` seconds) across the two-month window. */
function buildDenseRow(
	label: string,
	seed: number,
	stepSeconds: number,
): {
	label: string;
	segments: SegmentData[];
	seriesLabels: Record<string, string>;
} {
	const count = Math.floor(TWO_MONTHS_SECONDS / stepSeconds);
	const segments: SegmentData[] = [];
	let s = seed;
	for (let i = 0; i < count; i++) {
		s = (s * 1103515245 + 12345) & 0x7fffffff;
		const value = Math.floor((s / 0x7fffffff) * 6); // 0..5
		const startTime = TWO_MONTHS_START + i * stepSeconds;
		const endTime =
			i === count - 1
				? TWO_MONTHS_START + TWO_MONTHS_SECONDS
				: TWO_MONTHS_START + (i + 1) * stepSeconds;
		const { color, label: thresholdLabel } = bandFor(value);
		const last = segments[segments.length - 1];
		if (last && last.color === color) {
			last.endTime = endTime;
		} else {
			segments.push({ startTime, endTime, value, color, thresholdLabel });
		}
	}
	return { label, segments, seriesLabels: { service: label } };
}

/**
 * Two-month window, six threshold bands, 30-minute resolution. Because each
 * short-lived state is a tiny fraction of a 60-day span, segments collapse to
 * near-vertical lines — this is the "barcode" failure mode to evaluate.
 */
export const TwoMonthsManyThresholds: Story = {
	args: {
		swimLaneModel: {
			timeRange: {
				start: TWO_MONTHS_START,
				end: TWO_MONTHS_START + TWO_MONTHS_SECONDS,
			},
			rows: SERVICES.slice(0, 6).map((name, i) =>
				buildDenseRow(name, i + 1, 30 * 60),
			),
		},
	},
};

/** Empty model renders the "No Data" message. */
export const NoData: Story = {
	args: {
		swimLaneModel: {
			timeRange: { start: START, end: START + WINDOW_SECONDS },
			rows: [],
		},
	},
};
