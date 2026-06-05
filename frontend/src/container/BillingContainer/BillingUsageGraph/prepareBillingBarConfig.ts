import { Color } from '@signozhq/design-tokens';
import type { Timezone } from 'components/CustomTimePicker/timezoneUtils';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { getInitialStackedBands } from 'container/DashboardContainer/visualization/charts/utils/stackSeriesUtils';
import { buildBaseConfig } from 'container/DashboardContainer/visualization/panels/utils/baseConfigBuilder';
import { DrawStyle } from 'lib/uPlotV2/config/types';
import type { UPlotConfigBuilder } from 'lib/uPlotV2/config/UPlotConfigBuilder';
import type { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

const BILLING_SERIES_COLORS = [
	Color.BG_FOREST_300,
	Color.BG_ROBIN_500,
	Color.BG_SAKURA_500,
];

export interface PrepareBillingBarConfigProps {
	isDarkMode: boolean;
	timezone?: Timezone;
	minTimeScale?: number;
	maxTimeScale?: number;
	apiResponse?: MetricRangePayloadProps;
}

export function prepareBillingBarConfig({
	isDarkMode,
	timezone,
	minTimeScale,
	maxTimeScale,
	apiResponse,
}: PrepareBillingBarConfigProps): UPlotConfigBuilder {
	const builder = buildBaseConfig({
		id: 'billing-usage-breakdown',
		isDarkMode,
		timezone,
		panelType: PANEL_TYPES.BAR,
		minTimeScale,
		maxTimeScale,
	});

	const results = apiResponse?.data?.result;
	if (!results?.length) {
		return builder;
	}

	const labels = results.map((s) => s.legend || s.queryName || '');

	const colorMapping = labels.reduce<Record<string, string>>(
		(acc, label, index) => {
			acc[label] = BILLING_SERIES_COLORS[index] ?? Color.BG_AMBER_500;
			return acc;
		},
		{},
	);

	labels.forEach((label) => {
		builder.addSeries({
			scaleKey: 'y',
			drawStyle: DrawStyle.Bar,
			label,
			colorMapping,
			isDarkMode,
			metric: {},
		});
	});

	builder.setBands(getInitialStackedBands(results.length));
	builder.setPadding([32, 32, 16, 16]);
	builder.setFocus({ alpha: 0.3 });

	return builder;
}
