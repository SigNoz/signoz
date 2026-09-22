import type { DashboardtypesThresholdWithLabelDTO } from 'api/generated/services/sigNoz.schemas';
import type { PanelSeries } from 'pages/DashboardPage/DashboardContainer/queryV5/types';

import type { TimeRange } from '../../types';
import { transformSeriesToSwimLanes } from '../transformData';

/** timeRange is in seconds; series timestamps are epoch ms. */
const TIME_RANGE: TimeRange = { start: 1_000, end: 1_100 };

function series(
	overrides: Partial<PanelSeries> & { values: PanelSeries['values'] },
): PanelSeries {
	return {
		queryName: 'A',
		legend: '',
		labels: {},
		kind: 'series',
		aggregation: { index: 0, alias: '' },
		...overrides,
	};
}

/** ms points inside the [1000s, 1100s] window. */
function point(second: number, value: number): PanelSeries['values'][number] {
	return { timestamp: second * 1000, value };
}

const PASS_FAIL: DashboardtypesThresholdWithLabelDTO[] = [
	{ value: 0, color: '#FF0000', label: 'Fail' },
	{ value: 1, color: '#00FF00', label: 'Pass' },
];

describe('transformSeriesToSwimLanes', () => {
	it('produces no rows for an empty series list', () => {
		const model = transformSeriesToSwimLanes([], TIME_RANGE, PASS_FAIL, true);
		expect(model.rows).toStrictEqual([]);
		expect(model.timeRange).toStrictEqual(TIME_RANGE);
	});

	it('skips series with no values', () => {
		const model = transformSeriesToSwimLanes(
			[series({ legend: 'empty', values: [] })],
			TIME_RANGE,
			PASS_FAIL,
			true,
		);
		expect(model.rows).toStrictEqual([]);
	});

	it('builds one row per series, labelled by legend', () => {
		const model = transformSeriesToSwimLanes(
			[series({ legend: 'svc-a', values: [point(1000, 1)] })],
			TIME_RANGE,
			PASS_FAIL,
			true,
		);
		expect(model.rows).toHaveLength(1);
		expect(model.rows[0].label).toBe('svc-a');
	});

	it('falls back to the query name when there is no legend', () => {
		const model = transformSeriesToSwimLanes(
			[series({ queryName: 'B', legend: '', values: [point(1000, 1)] })],
			TIME_RANGE,
			PASS_FAIL,
			true,
		);
		expect(model.rows[0].label).toBe('B');
	});

	it('sorts rows alphabetically, case-insensitively', () => {
		const model = transformSeriesToSwimLanes(
			[
				series({ legend: 'Zeta', values: [point(1000, 1)] }),
				series({ legend: 'alpha', values: [point(1000, 1)] }),
			],
			TIME_RANGE,
			PASS_FAIL,
			true,
		);
		expect(model.rows.map((r) => r.label)).toStrictEqual(['alpha', 'Zeta']);
	});

	it('ends a single point one step interval after its timestamp (data-derived, not the view)', () => {
		const model = transformSeriesToSwimLanes(
			[series({ legend: 'svc', values: [point(1000, 1)] })],
			TIME_RANGE,
			PASS_FAIL,
			true,
			{ A: 15 },
		);
		const [segment] = model.rows[0].segments;
		expect(segment.startTime).toBe(1000);
		// 1000 + 15s step — independent of TIME_RANGE.end.
		expect(segment.endTime).toBe(1015);
		expect(segment.color).toBe('#00FF00');
		expect(segment.thresholdLabel).toBe('Pass');
	});

	it('keeps segment duration fixed when the view window changes', () => {
		const values = [point(1000, 1), point(1030, 0)];
		const narrow = transformSeriesToSwimLanes(
			[series({ legend: 'svc', values })],
			{ start: 995, end: 1045 },
			PASS_FAIL,
			true,
			{ A: 30 },
		);
		const wide = transformSeriesToSwimLanes(
			[series({ legend: 'svc', values })],
			{ start: 0, end: 100_000 },
			PASS_FAIL,
			true,
			{ A: 30 },
		);
		const narrowLast = narrow.rows[0].segments.at(-1);
		const wideLast = wide.rows[0].segments.at(-1);
		// The final (red) segment ends at 1030 + 30s step in both views.
		expect(narrowLast?.endTime).toBe(1060);
		expect(wideLast?.endTime).toBe(1060);
		expect(narrowLast?.endTime).toBe(wideLast?.endTime);
	});

	it('merges consecutive same-state points into one segment', () => {
		const model = transformSeriesToSwimLanes(
			[
				series({
					legend: 'svc',
					values: [point(1000, 1), point(1020, 1), point(1040, 0)],
				}),
			],
			TIME_RANGE,
			PASS_FAIL,
			true,
		);
		const { segments } = model.rows[0];
		// Two merged green points, then one red.
		expect(segments).toHaveLength(2);
		expect(segments[0].color).toBe('#00FF00');
		expect(segments[0].startTime).toBe(1000);
		expect(segments[0].endTime).toBe(1040);
		expect(segments[1].color).toBe('#FF0000');
	});

	it('carries the original labels through for context links', () => {
		const model = transformSeriesToSwimLanes(
			[
				series({
					legend: 'svc',
					labels: { service: 'api', env: 'prod' },
					values: [point(1000, 1)],
				}),
			],
			TIME_RANGE,
			PASS_FAIL,
			true,
		);
		expect(model.rows[0].seriesLabels).toStrictEqual({
			service: 'api',
			env: 'prod',
		});
	});

	it('prepends a leading "No Data" segment when data starts well after the range start', () => {
		// First point at 1080s, range starts at 1000s → 80s > 60s leading gap.
		const model = transformSeriesToSwimLanes(
			[series({ legend: 'svc', values: [point(1080, 1)] })],
			TIME_RANGE,
			PASS_FAIL,
			true,
		);
		const { segments } = model.rows[0];
		expect(segments[0].thresholdLabel).toBe('No Data');
		expect(segments[0].startTime).toBe(TIME_RANGE.start);
		expect(segments[0].value).toBeNull();
	});
});
