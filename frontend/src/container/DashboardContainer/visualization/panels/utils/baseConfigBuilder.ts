import { Timezone } from 'components/CustomTimePicker/timezoneUtils';
import { PANEL_TYPES } from 'constants/queryBuilder';
import onClickPlugin, {
	OnClickPluginOpts,
} from 'lib/uPlotLib/plugins/onClickPlugin';
import {
	DistributionType,
	SelectionPreferencesSource,
} from 'lib/uPlotV2/config/types';
import { UPlotConfigBuilder } from 'lib/uPlotV2/config/UPlotConfigBuilder';
import { ThresholdsDrawHookOptions } from 'lib/uPlotV2/hooks/types';
import { Widgets } from 'types/api/dashboard/getAll';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import uPlot from 'uplot';

import { PanelMode } from '../types';

export interface BaseConfigBuilderProps {
	widget: Widgets;
	apiResponse: MetricRangePayloadProps;
	isDarkMode: boolean;
	onClick?: OnClickPluginOpts['onClick'];
	onDragSelect?: (startTime: number, endTime: number) => void;
	timezone?: Timezone;
	panelMode: PanelMode;
	panelType: PANEL_TYPES;
	minTimeScale?: number;
	maxTimeScale?: number;
}

export function buildBaseConfig({
	widget,
	isDarkMode,
	onClick,
	onDragSelect,
	apiResponse,
	timezone,
	panelMode,
	panelType,
	minTimeScale,
	maxTimeScale,
}: BaseConfigBuilderProps): UPlotConfigBuilder {
	const tzDate = timezone
		? (timestamp: number): Date =>
				uPlot.tzDate(new Date(timestamp * 1e3), timezone.value)
		: undefined;

	const builder = new UPlotConfigBuilder({
		onDragSelect,
		widgetId: widget.id,
		tzDate,
		shouldSaveSelectionPreference: panelMode === PanelMode.DASHBOARD_VIEW,
		selectionPreferencesSource: [
			PanelMode.DASHBOARD_VIEW,
			PanelMode.STANDALONE_VIEW,
		].includes(panelMode)
			? SelectionPreferencesSource.LOCAL_STORAGE
			: SelectionPreferencesSource.IN_MEMORY,
	});

	const thresholdOptions: ThresholdsDrawHookOptions = {
		scaleKey: 'y',
		thresholds: (widget.thresholds || []).map((threshold) => ({
			thresholdValue: threshold.thresholdValue ?? 0,
			thresholdColor: threshold.thresholdColor,
			thresholdUnit: threshold.thresholdUnit,
			thresholdLabel: threshold.thresholdLabel,
		})),
		yAxisUnit: widget.yAxisUnit,
	};

	builder.addThresholds(thresholdOptions);

	builder.addScale({
		scaleKey: 'x',
		time: true,
		min: minTimeScale,
		max: maxTimeScale,
		logBase: widget.isLogScale ? 10 : undefined,
		distribution: widget.isLogScale
			? DistributionType.Logarithmic
			: DistributionType.Linear,
	});

	// Y scale – value axis, driven primarily by softMin/softMax and data
	builder.addScale({
		scaleKey: 'y',
		time: false,
		min: undefined,
		max: undefined,
		softMin: widget.softMin ?? undefined,
		softMax: widget.softMax ?? undefined,
		thresholds: thresholdOptions,
		logBase: widget.isLogScale ? 10 : undefined,
		distribution: widget.isLogScale
			? DistributionType.Logarithmic
			: DistributionType.Linear,
	});

	if (typeof onClick === 'function') {
		builder.addPlugin(
			onClickPlugin({
				onClick,
				apiResponse,
			}),
		);
	}

	builder.addAxis({
		scaleKey: 'x',
		show: true,
		side: 2,
		isDarkMode,
		isLogScale: widget.isLogScale,
		panelType,
	});

	builder.addAxis({
		scaleKey: 'y',
		show: true,
		side: 3,
		isDarkMode,
		isLogScale: widget.isLogScale,
		yAxisUnit: widget.yAxisUnit,
		panelType,
	});

	return builder;
}
