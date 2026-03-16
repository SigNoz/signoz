import { Timezone } from 'components/CustomTimePicker/timezoneUtils';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { ThresholdProps } from 'container/NewWidget/RightContainer/Threshold/types';
import onClickPlugin, {
	OnClickPluginOpts,
} from 'lib/uPlotLib/plugins/onClickPlugin';
import {
	DistributionType,
	SelectionPreferencesSource,
} from 'lib/uPlotV2/config/types';
import { UPlotConfigBuilder } from 'lib/uPlotV2/config/UPlotConfigBuilder';
import { ThresholdsDrawHookOptions } from 'lib/uPlotV2/hooks/types';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import uPlot from 'uplot';

import { PanelMode } from '../types';

export interface BaseConfigBuilderProps {
	id: string;
	thresholds?: ThresholdProps[];
	apiResponse?: MetricRangePayloadProps;
	isDarkMode: boolean;
	onClick?: OnClickPluginOpts['onClick'];
	onDragSelect?: (startTime: number, endTime: number) => void;
	timezone?: Timezone;
	panelMode?: PanelMode;
	panelType: PANEL_TYPES;
	minTimeScale?: number;
	maxTimeScale?: number;
	stepInterval?: number;
	isLogScale?: boolean;
	yAxisUnit?: string;
	softMin?: number;
	softMax?: number;
}

export function buildBaseConfig({
	id,
	isDarkMode,
	onClick,
	onDragSelect,
	apiResponse,
	timezone,
	panelMode,
	panelType,
	thresholds,
	minTimeScale,
	maxTimeScale,
	stepInterval,
	isLogScale,
	yAxisUnit,
	softMin,
	softMax,
}: BaseConfigBuilderProps): UPlotConfigBuilder {
	const tzDate = timezone
		? (timestamp: number): Date =>
				uPlot.tzDate(new Date(timestamp * 1e3), timezone.value)
		: undefined;

	const builder = new UPlotConfigBuilder({
		id,
		onDragSelect,
		tzDate,
		shouldSaveSelectionPreference: panelMode === PanelMode.DASHBOARD_VIEW,
		selectionPreferencesSource: panelMode
			? [PanelMode.DASHBOARD_VIEW, PanelMode.STANDALONE_VIEW].includes(panelMode)
				? SelectionPreferencesSource.LOCAL_STORAGE
				: SelectionPreferencesSource.IN_MEMORY
			: SelectionPreferencesSource.IN_MEMORY,
		stepInterval,
	});

	const thresholdOptions: ThresholdsDrawHookOptions = {
		scaleKey: 'y',
		thresholds: (thresholds || []).map((threshold) => ({
			thresholdValue: threshold.thresholdValue ?? 0,
			thresholdColor: threshold.thresholdColor,
			thresholdUnit: threshold.thresholdUnit,
			thresholdLabel: threshold.thresholdLabel,
		})),
		yAxisUnit: yAxisUnit,
	};

	builder.addThresholds(thresholdOptions);

	builder.addScale({
		scaleKey: 'x',
		time: true,
		min: minTimeScale,
		max: maxTimeScale,
		logBase: isLogScale ? 10 : undefined,
		distribution: isLogScale
			? DistributionType.Logarithmic
			: DistributionType.Linear,
	});

	// Y scale – value axis, driven primarily by softMin/softMax and data
	builder.addScale({
		scaleKey: 'y',
		time: false,
		min: undefined,
		max: undefined,
		softMin: softMin,
		softMax: softMax,
		thresholds: thresholdOptions,
		logBase: isLogScale ? 10 : undefined,
		distribution: isLogScale
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
		isLogScale,
		panelType,
	});

	builder.addAxis({
		scaleKey: 'y',
		show: true,
		side: 3,
		isDarkMode,
		isLogScale,
		yAxisUnit,
		panelType,
	});

	return builder;
}
