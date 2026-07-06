import type { DashboardtypesTimeSeriesPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';
import { UTC_TIMEZONE } from 'components/CustomTimePicker/timezoneUtils';
import { PanelMode } from 'container/DashboardContainer/visualization/panels/types';
import type { PanelSeries } from 'pages/DashboardPageV2/DashboardContainer/queryV5/types';

import { buildTimeSeriesConfig } from '../buildConfig';

const series: PanelSeries[] = [
	{
		queryName: 'A',
		legend: 'A',
		labels: {},
		values: [
			{ timestamp: 1000, value: 1 },
			{ timestamp: 61000, value: 2 },
		],
		kind: 'series',
		aggregation: { index: 0, alias: 'A' },
	},
];

/** Resolved per-series `spanGaps` values from a built TimeSeries config. */
function spanGapsFor(
	spanGaps: unknown,
	stepIntervals?: Record<string, number>,
): (boolean | number | undefined)[] {
	const spec = {
		chartAppearance: spanGaps ? { spanGaps } : {},
	} as unknown as DashboardtypesTimeSeriesPanelSpecDTO;
	return buildTimeSeriesConfig({
		panelId: 'p1',
		spec,
		builderQueries: [],
		series,
		stepIntervals,
		isDarkMode: false,
		timezone: UTC_TIMEZONE,
		panelMode: PanelMode.DASHBOARD_VIEW,
	})
		.getSeriesSpanGapsOptions()
		.map((o) => o.spanGaps);
}

describe('buildTimeSeriesConfig spanGaps', () => {
	it('floors a numeric threshold below the step interval at the step interval', () => {
		expect(
			spanGapsFor({ fillOnlyBelow: true, fillLessThan: '10s' }, { A: 60 }),
		).toStrictEqual([60]);
	});

	it('keeps a numeric threshold larger than the step interval', () => {
		expect(
			spanGapsFor({ fillOnlyBelow: true, fillLessThan: '300s' }, { A: 60 }),
		).toStrictEqual([300]);
	});

	it('uses the smallest step interval across queries as the floor', () => {
		expect(
			spanGapsFor({ fillOnlyBelow: true, fillLessThan: '10s' }, { A: 60, B: 30 }),
		).toStrictEqual([30]);
	});

	it('leaves boolean span-all (true) untouched', () => {
		expect(spanGapsFor(undefined, { A: 60 })).toStrictEqual([true]);
		// fillOnlyBelow false → resolveSpanGaps returns true → not clamped.
		expect(
			spanGapsFor({ fillOnlyBelow: false, fillLessThan: '10s' }, { A: 60 }),
		).toStrictEqual([true]);
	});

	it('passes a numeric threshold through when no step intervals are known', () => {
		expect(
			spanGapsFor({ fillOnlyBelow: true, fillLessThan: '10s' }),
		).toStrictEqual([10]);
	});
});
