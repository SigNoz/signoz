import type { DashboardtypesBarChartPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';
import { UTC_TIMEZONE } from 'components/CustomTimePicker/timezoneUtils';
import type { ExtendedSeries } from 'lib/uPlotV2/config/types';
import { PanelMode } from 'lib/visualization/panels/types';

import { buildBarChartConfig } from '../buildConfig';

describe('buildBarChartConfig partial buckets', () => {
	it('passes partial timestamps (epoch seconds) to the series', () => {
		const config = buildBarChartConfig({
			panelId: 'p1',
			spec: {} as DashboardtypesBarChartPanelSpecDTO,
			builderQueries: [],
			series: [
				{
					queryName: 'A',
					legend: 'A',
					labels: {},
					values: [
						{ timestamp: 1000, value: 1 },
						{ timestamp: 61000, value: 0.2, partial: true },
					],
					kind: 'series',
					aggregation: { index: 0, alias: 'A' },
				},
			],
			isDarkMode: false,
			timezone: UTC_TIMEZONE,
			panelMode: PanelMode.DASHBOARD_VIEW,
		}).getConfig().series?.[1] as ExtendedSeries;

		expect(config.partialTimestamps).toStrictEqual(new Set([61]));
	});
});
