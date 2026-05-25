import { Color } from '@signozhq/design-tokens';
import { ExecStats } from 'api/v5/v5';
import { Timezone } from 'components/CustomTimePicker/timezoneUtils';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { Threshold } from 'container/CreateAlertV2/context/types';
import { PanelMode } from 'container/DashboardContainer/visualization/panels/types';
import { buildBaseConfig } from 'container/DashboardContainer/visualization/panels/utils/baseConfigBuilder';
import { ThresholdProps } from 'container/NewWidget/RightContainer/Threshold/types';
import {
	BooleanFormats,
	DataFormats,
	DataRateFormats,
	MiscellaneousFormats,
	ThroughputFormats,
	TimeFormats,
} from 'container/NewWidget/RightContainer/types';
import { TFunction } from 'i18next';
import { getLegend } from 'lib/dashboard/getQueryResults';
import getLabelName from 'lib/getLabelName';
import { OnClickPluginOpts } from 'lib/uPlotLib/plugins/onClickPlugin';
import {
	DrawStyle,
	FillMode,
	LineInterpolation,
	LineStyle,
} from 'lib/uPlotV2/config/types';
import { UPlotConfigBuilder } from 'lib/uPlotV2/config/UPlotConfigBuilder';
import { hasSingleVisiblePoint } from 'lib/uPlotV2/utils/dataUtils';
import { get } from 'lodash-es';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import {
	dataFormatConfig,
	dataRateUnitsConfig,
	miscUnitsConfig,
	throughputConfig,
	timeUnitsConfig,
} from './config';

const CHART_ID_PREFIX = 'alert_legend_widget';

export function covertIntoDataFormats({
	value,
	sourceUnit,
	targetUnit,
}: IUnit): number {
	if (sourceUnit === undefined || targetUnit === undefined) {
		return value;
	}

	if (Object.values(BooleanFormats).includes(sourceUnit as BooleanFormats)) {
		return 1;
	}

	const sourceMultiplier =
		dataFormatConfig[sourceUnit as DataFormats] ||
		timeUnitsConfig[sourceUnit as TimeFormats] ||
		dataRateUnitsConfig[sourceUnit as DataRateFormats] ||
		miscUnitsConfig[sourceUnit as MiscellaneousFormats] ||
		throughputConfig[sourceUnit as ThroughputFormats];

	const targetDivider =
		dataFormatConfig[targetUnit as DataFormats] ||
		timeUnitsConfig[targetUnit as TimeFormats] ||
		dataRateUnitsConfig[targetUnit as DataRateFormats] ||
		miscUnitsConfig[targetUnit as MiscellaneousFormats] ||
		throughputConfig[sourceUnit as ThroughputFormats];

	const intermediateValue = value * sourceMultiplier;

	const roundedValue = Math.round(intermediateValue * 1000000) / 1000000;

	const result = roundedValue / targetDivider;

	return Number.isNaN(result) ? 0 : result;
}

export const getThresholdLabel = (
	optionName: string,
	value: number,
	unit?: string,
	yAxisUnit?: string,
): string => {
	if (
		unit === MiscellaneousFormats.PercentUnit ||
		yAxisUnit === MiscellaneousFormats.PercentUnit
	) {
		if (unit === MiscellaneousFormats.Percent) {
			return `${value}%`;
		}
		return `${value * 100}%`;
	}
	if (
		unit === MiscellaneousFormats.Percent ||
		yAxisUnit === MiscellaneousFormats.Percent
	) {
		if (unit === MiscellaneousFormats.PercentUnit) {
			return `${value * 100}%`;
		}
		return `${value}%`;
	}
	return `${value} ${optionName}`;
};

interface IUnit {
	value: number;
	sourceUnit?: string;
	targetUnit?: string;
}

export const getThresholds = (
	thresholds: Threshold[],
	t: TFunction,
	optionName: string,
	yAxisUnit: string,
): ThresholdProps[] => {
	const thresholdsToReturn = new Array<ThresholdProps>();

	thresholds.forEach((threshold, index) => {
		// Push main threshold
		const mainThreshold = {
			index: index.toString(),
			keyIndex: index,
			moveThreshold: (): void => {},
			selectedGraph: PANEL_TYPES.TIME_SERIES,
			thresholdValue: threshold.thresholdValue,
			thresholdLabel:
				threshold.label ||
				`${t('preview_chart_threshold_label')} (y=${getThresholdLabel(
					optionName,
					threshold.thresholdValue,
					threshold.unit,
					yAxisUnit,
				)})`,
			thresholdUnit: threshold.unit,
			thresholdColor: threshold.color || Color.TEXT_SAKURA_500,
		};
		thresholdsToReturn.push(mainThreshold);

		// Push recovery threshold
		if (threshold.recoveryThresholdValue) {
			const recoveryThreshold = {
				index: (thresholds.length + index).toString(),
				keyIndex: thresholds.length + index,
				moveThreshold: (): void => {},
				selectedGraph: PANEL_TYPES.TIME_SERIES, // no impact
				thresholdValue: threshold.recoveryThresholdValue,
				thresholdLabel: threshold.label
					? `${threshold.label} (Recovery)`
					: `${t('preview_chart_threshold_label')} (y=${getThresholdLabel(
							optionName,
							threshold.thresholdValue,
							threshold.unit,
							yAxisUnit,
						)})`,
				thresholdUnit: threshold.unit,
				thresholdColor: threshold.color || Color.TEXT_SAKURA_500,
			};
			thresholdsToReturn.push(recoveryThreshold);
		}
	});
	return thresholdsToReturn;
};

export type AlertChartPanelType = PANEL_TYPES.TIME_SERIES | PANEL_TYPES.BAR;

export interface BuildAlertChartConfigParams {
	id: string;
	panelType: AlertChartPanelType;
	query: Query;
	thresholds: ThresholdProps[];
	apiResponse?: MetricRangePayloadProps;
	yAxisUnit?: string;
	isDarkMode: boolean;
	timezone: Timezone;
	minTimeScale?: number;
	maxTimeScale?: number;
	onDragSelect: (startTime: number, endTime: number) => void;
	onClick?: OnClickPluginOpts['onClick'];
}

export const buildAlertChartConfig = ({
	id,
	panelType,
	query,
	thresholds,
	apiResponse,
	yAxisUnit,
	isDarkMode,
	timezone,
	minTimeScale,
	maxTimeScale,
	onDragSelect,
	onClick,
}: BuildAlertChartConfigParams): UPlotConfigBuilder => {
	const stepIntervals: ExecStats['stepIntervals'] = get(
		apiResponse,
		'data.newResult.meta.stepIntervals',
		{},
	);
	const stepIntervalValues = Object.values(stepIntervals);
	const minStepInterval = stepIntervalValues.length
		? Math.min(...stepIntervalValues)
		: undefined;

	const builder = buildBaseConfig({
		id,
		panelType,
		panelMode: PanelMode.DASHBOARD_VIEW,
		thresholds,
		apiResponse,
		yAxisUnit,
		isDarkMode,
		timezone,
		minTimeScale,
		maxTimeScale,
		stepInterval: minStepInterval,
		onDragSelect,
		onClick,
	});

	const seriesList = apiResponse?.data?.result;
	if (!seriesList?.length) {
		return builder;
	}

	const isBar = panelType === PANEL_TYPES.BAR;

	seriesList.forEach((series) => {
		const baseLabelName = getLabelName(
			series.metric,
			series.queryName || '',
			series.legend || '',
		);
		const label = query ? getLegend(series, query, baseLabelName) : baseLabelName;

		if (isBar) {
			builder.addSeries({
				scaleKey: 'y',
				drawStyle: DrawStyle.Bar,
				label,
				colorMapping: {},
				isDarkMode,
				stepInterval: get(stepIntervals, series.queryName, undefined),
			});
			return;
		}

		const hasSingleValidPoint = hasSingleVisiblePoint(series.values);
		builder.addSeries({
			scaleKey: 'y',
			drawStyle: hasSingleValidPoint ? DrawStyle.Points : DrawStyle.Line,
			label,
			colorMapping: {},
			spanGaps: true,
			lineStyle: LineStyle.Solid,
			lineInterpolation: LineInterpolation.Spline,
			showPoints: hasSingleValidPoint,
			pointSize: 5,
			fillMode: FillMode.None,
			isDarkMode,
			metric: series.metric,
		});
	});

	return builder;
};

export const buildChartId = (id?: string): string =>
	id ? `${CHART_ID_PREFIX}_${id}` : CHART_ID_PREFIX;
