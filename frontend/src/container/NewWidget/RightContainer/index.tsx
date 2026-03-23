import { Dispatch, SetStateAction, useMemo } from 'react';
import { UseQueryResult } from 'react-query';
import { Typography } from 'antd';
import { ExecStats } from 'api/v5/v5';
import { PrecisionOption, PrecisionOptionsEnum } from 'components/Graph/types';
import { PANEL_TYPES, PanelDisplay } from 'constants/queryBuilder';
import { PanelTypesWithData } from 'container/DashboardContainer/PanelTypeSelectionModal/menuItems';
import { useDashboardVariables } from 'hooks/dashboard/useDashboardVariables';
import useCreateAlerts from 'hooks/queryBuilder/useCreateAlerts';
import {
	FillMode,
	LineInterpolation,
	LineStyle,
} from 'lib/uPlotV2/config/types';
import get from 'lodash-es/get';
import { SuccessResponse } from 'types/api';
import {
	ColumnUnit,
	ContextLinksData,
	LegendPosition,
	Widgets,
} from 'types/api/dashboard/getAll';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

import {
	panelTypeVsBucketConfig,
	panelTypeVsColumnUnitPreferences,
	panelTypeVsContextLinks,
	panelTypeVsCreateAlert,
	panelTypeVsDecimalPrecision,
	panelTypeVsFillMode,
	panelTypeVsFillSpan,
	panelTypeVsLegendColors,
	panelTypeVsLegendPosition,
	panelTypeVsLineInterpolation,
	panelTypeVsLineStyle,
	panelTypeVsLogScale,
	panelTypeVsPanelTimePreferences,
	panelTypeVsShowPoints,
	panelTypeVsSoftMinMax,
	panelTypeVsSpanGaps,
	panelTypeVsStackingChartPreferences,
	panelTypeVsThreshold,
	panelTypeVsYAxisUnit,
} from './constants';
import AlertsSection from './SettingSections/AlertsSection/AlertsSection';
import AxesSection from './SettingSections/AxesSection/AxesSection';
import ChartAppearanceSection from './SettingSections/ChartAppearanceSection/ChartAppearanceSection';
import ContextLinksSection from './SettingSections/ContextLinksSection/ContextLinksSection';
import FormattingUnitsSection from './SettingSections/FormattingUnitsSection/FormattingUnitsSection';
import GeneralSettingsSection from './SettingSections/GeneralSettingsSection/GeneralSettingsSection';
import HistogramBucketsSection from './SettingSections/HistogramBucketsSection/HistogramBucketsSection';
import LegendSection from './SettingSections/LegendSection/LegendSection';
import ThresholdsSection from './SettingSections/ThresholdsSection/ThresholdsSection';
import VisualizationSettingsSection from './SettingSections/VisualizationSettingsSection/VisualizationSettingsSection';
import { ThresholdProps } from './Threshold/types';
import { timePreferance } from './timeItems';

import './RightContainer.styles.scss';
function RightContainer({
	description,
	setDescription,
	setTitle,
	title,
	selectedGraph,
	lineInterpolation,
	setLineInterpolation,
	fillMode,
	setFillMode,
	lineStyle,
	setLineStyle,
	showPoints,
	setShowPoints,
	spanGaps,
	setSpanGaps,
	bucketCount,
	bucketWidth,
	stackedBarChart,
	setStackedBarChart,
	setBucketCount,
	setBucketWidth,
	setSelectedTime,
	selectedTime,
	yAxisUnit,
	setYAxisUnit,
	decimalPrecision,
	setDecimalPrecision,
	setGraphHandler,
	thresholds,
	combineHistogram,
	setCombineHistogram,
	setThresholds,
	selectedWidget,
	isFillSpans,
	setIsFillSpans,
	softMax,
	softMin,
	setSoftMax,
	setSoftMin,
	columnUnits,
	setColumnUnits,
	isLogScale,
	setIsLogScale,
	legendPosition,
	setLegendPosition,
	customLegendColors,
	setCustomLegendColors,
	queryResponse,
	contextLinks,
	setContextLinks,
	enableDrillDown = false,
	isNewDashboard,
}: RightContainerProps): JSX.Element {
	const { dashboardVariables } = useDashboardVariables();

	const selectedPanelDisplay = PanelTypesWithData.find(
		(e) => e.name === selectedGraph,
	)?.display as PanelDisplay;

	const onCreateAlertsHandler = useCreateAlerts(selectedWidget, 'panelView');

	const allowThreshold = panelTypeVsThreshold[selectedGraph];
	const allowSoftMinMax = panelTypeVsSoftMinMax[selectedGraph];
	const allowFillSpans = panelTypeVsFillSpan[selectedGraph];
	const allowLogScale = panelTypeVsLogScale[selectedGraph];
	const allowYAxisUnit = panelTypeVsYAxisUnit[selectedGraph];
	const allowCreateAlerts = panelTypeVsCreateAlert[selectedGraph];
	const allowBucketConfig = panelTypeVsBucketConfig[selectedGraph];
	const allowStackingBarChart =
		panelTypeVsStackingChartPreferences[selectedGraph];
	const allowPanelTimePreference =
		panelTypeVsPanelTimePreferences[selectedGraph];
	const allowLegendPosition = panelTypeVsLegendPosition[selectedGraph];
	const allowLegendColors = panelTypeVsLegendColors[selectedGraph];

	const allowPanelColumnPreference =
		panelTypeVsColumnUnitPreferences[selectedGraph];
	const allowContextLinks =
		panelTypeVsContextLinks[selectedGraph] && enableDrillDown;
	const allowDecimalPrecision = panelTypeVsDecimalPrecision[selectedGraph];

	const allowLineInterpolation = panelTypeVsLineInterpolation[selectedGraph];
	const allowLineStyle = panelTypeVsLineStyle[selectedGraph];
	const allowFillMode = panelTypeVsFillMode[selectedGraph];
	const allowShowPoints = panelTypeVsShowPoints[selectedGraph];
	const allowSpanGaps = panelTypeVsSpanGaps[selectedGraph];

	const decimapPrecisionOptions = useMemo(
		() => [
			{ label: '0 decimals', value: PrecisionOptionsEnum.ZERO },
			{ label: '1 decimal', value: PrecisionOptionsEnum.ONE },
			{ label: '2 decimals', value: PrecisionOptionsEnum.TWO },
			{ label: '3 decimals', value: PrecisionOptionsEnum.THREE },
		],
		[],
	);

	const isAxisSectionVisible = useMemo(() => allowSoftMinMax || allowLogScale, [
		allowSoftMinMax,
		allowLogScale,
	]);

	const isFormattingSectionVisible = useMemo(
		() => allowYAxisUnit || allowDecimalPrecision || allowPanelColumnPreference,
		[allowYAxisUnit, allowDecimalPrecision, allowPanelColumnPreference],
	);

	const isLegendSectionVisible = useMemo(
		() => allowLegendPosition || allowLegendColors,
		[allowLegendPosition, allowLegendColors],
	);

	const isChartAppearanceSectionVisible = useMemo(
		() =>
			/**
			 * Disabled for now as we are not done with other settings in chart appearance section
			 * TODO: @ahrefabhi Enable this after we are done other settings in chart appearance section
			 */

			// eslint-disable-next-line sonarjs/no-redundant-boolean
			false &&
			(allowFillMode ||
				allowLineStyle ||
				allowLineInterpolation ||
				allowShowPoints ||
				allowSpanGaps),
		[
			allowFillMode,
			allowLineStyle,
			allowLineInterpolation,
			allowShowPoints,
			allowSpanGaps,
		],
	);

	const stepInterval = useMemo(() => {
		const stepIntervals: ExecStats['stepIntervals'] = get(
			queryResponse,
			'data.payload.data.newResult.meta.stepIntervals',
			{},
		);
		return Math.min(...Object.values(stepIntervals));
	}, [queryResponse]);

	return (
		<div className="right-container">
			<section className="header">
				<div className="purple-dot" />
				<Typography.Text className="header-text">Panel Settings</Typography.Text>
			</section>

			<GeneralSettingsSection
				title={title}
				setTitle={setTitle}
				description={description}
				setDescription={setDescription}
				dashboardVariables={dashboardVariables}
			/>

			<section className="panel-config">
				<VisualizationSettingsSection
					selectedGraph={selectedGraph}
					setGraphHandler={setGraphHandler}
					selectedTime={selectedTime}
					setSelectedTime={setSelectedTime}
					stackedBarChart={stackedBarChart}
					setStackedBarChart={setStackedBarChart}
					isFillSpans={isFillSpans}
					setIsFillSpans={setIsFillSpans}
					allowPanelTimePreference={allowPanelTimePreference}
					allowStackingBarChart={allowStackingBarChart}
					allowFillSpans={allowFillSpans}
				/>

				{isFormattingSectionVisible && (
					<FormattingUnitsSection
						selectedPanelDisplay={selectedPanelDisplay}
						yAxisUnit={yAxisUnit}
						setYAxisUnit={setYAxisUnit}
						isNewDashboard={isNewDashboard}
						decimalPrecision={decimalPrecision}
						setDecimalPrecision={setDecimalPrecision}
						columnUnits={columnUnits}
						setColumnUnits={setColumnUnits}
						allowYAxisUnit={allowYAxisUnit}
						allowDecimalPrecision={allowDecimalPrecision}
						allowPanelColumnPreference={allowPanelColumnPreference}
						decimapPrecisionOptions={decimapPrecisionOptions}
					/>
				)}

				{isChartAppearanceSectionVisible && (
					<ChartAppearanceSection
						fillMode={fillMode}
						setFillMode={setFillMode}
						lineStyle={lineStyle}
						setLineStyle={setLineStyle}
						lineInterpolation={lineInterpolation}
						setLineInterpolation={setLineInterpolation}
						showPoints={showPoints}
						setShowPoints={setShowPoints}
						spanGaps={spanGaps}
						setSpanGaps={setSpanGaps}
						allowFillMode={allowFillMode}
						allowLineStyle={allowLineStyle}
						allowLineInterpolation={allowLineInterpolation}
						allowShowPoints={allowShowPoints}
						allowSpanGaps={allowSpanGaps}
						stepInterval={stepInterval}
					/>
				)}

				{isAxisSectionVisible && (
					<AxesSection
						allowSoftMinMax={allowSoftMinMax}
						allowLogScale={allowLogScale}
						softMin={softMin}
						softMax={softMax}
						setSoftMin={setSoftMin}
						setSoftMax={setSoftMax}
						isLogScale={isLogScale}
						setIsLogScale={setIsLogScale}
					/>
				)}

				{isLegendSectionVisible && (
					<LegendSection
						allowLegendPosition={allowLegendPosition}
						allowLegendColors={allowLegendColors}
						legendPosition={legendPosition}
						setLegendPosition={setLegendPosition}
						customLegendColors={customLegendColors}
						setCustomLegendColors={setCustomLegendColors}
						queryResponse={queryResponse}
					/>
				)}

				{allowBucketConfig && (
					<HistogramBucketsSection
						bucketCount={bucketCount}
						setBucketCount={setBucketCount}
						bucketWidth={bucketWidth}
						setBucketWidth={setBucketWidth}
						combineHistogram={combineHistogram}
						setCombineHistogram={setCombineHistogram}
					/>
				)}
			</section>

			{allowCreateAlerts && (
				<AlertsSection onCreateAlertsHandler={onCreateAlertsHandler} />
			)}

			{allowContextLinks && (
				<ContextLinksSection
					contextLinks={contextLinks}
					setContextLinks={setContextLinks}
					selectedWidget={selectedWidget}
				/>
			)}

			{allowThreshold && (
				<ThresholdsSection
					thresholds={thresholds}
					setThresholds={setThresholds}
					yAxisUnit={yAxisUnit}
					selectedGraph={selectedGraph}
					columnUnits={columnUnits}
				/>
			)}
		</div>
	);
}

export interface RightContainerProps {
	title: string;
	setTitle: Dispatch<SetStateAction<string>>;
	description: string;
	setDescription: Dispatch<SetStateAction<string>>;
	opacity: string;
	setOpacity: Dispatch<SetStateAction<string>>;
	selectedNullZeroValue: string;
	setSelectedNullZeroValue: Dispatch<SetStateAction<string>>;
	selectedGraph: PANEL_TYPES;
	setSelectedTime: Dispatch<SetStateAction<timePreferance>>;
	selectedTime: timePreferance;
	yAxisUnit: string;
	stackedBarChart: boolean;
	setStackedBarChart: Dispatch<SetStateAction<boolean>>;
	bucketWidth: number;
	bucketCount: number;
	combineHistogram: boolean;
	setCombineHistogram: Dispatch<SetStateAction<boolean>>;
	setBucketWidth: Dispatch<SetStateAction<number>>;
	setBucketCount: Dispatch<SetStateAction<number>>;
	setYAxisUnit: Dispatch<SetStateAction<string>>;
	decimalPrecision: PrecisionOption;
	setDecimalPrecision: Dispatch<SetStateAction<PrecisionOption>>;
	setGraphHandler: (type: PANEL_TYPES) => void;
	thresholds: ThresholdProps[];
	setThresholds: Dispatch<SetStateAction<ThresholdProps[]>>;
	selectedWidget?: Widgets;
	isFillSpans: boolean;
	setIsFillSpans: Dispatch<SetStateAction<boolean>>;
	softMin: number | null;
	softMax: number | null;
	columnUnits: ColumnUnit;
	setColumnUnits: Dispatch<SetStateAction<ColumnUnit>>;
	setSoftMin: Dispatch<SetStateAction<number | null>>;
	setSoftMax: Dispatch<SetStateAction<number | null>>;
	isLogScale: boolean;
	setIsLogScale: Dispatch<SetStateAction<boolean>>;
	legendPosition: LegendPosition;
	setLegendPosition: Dispatch<SetStateAction<LegendPosition>>;
	customLegendColors: Record<string, string>;
	setCustomLegendColors: Dispatch<SetStateAction<Record<string, string>>>;
	queryResponse?: UseQueryResult<
		SuccessResponse<MetricRangePayloadProps, unknown>,
		Error
	>;
	contextLinks: ContextLinksData;
	setContextLinks: Dispatch<SetStateAction<ContextLinksData>>;
	enableDrillDown?: boolean;
	isNewDashboard: boolean;
	lineInterpolation: LineInterpolation;
	setLineInterpolation: Dispatch<SetStateAction<LineInterpolation>>;
	fillMode: FillMode;
	setFillMode: Dispatch<SetStateAction<FillMode>>;
	lineStyle: LineStyle;
	setLineStyle: Dispatch<SetStateAction<LineStyle>>;
	showPoints: boolean;
	setShowPoints: Dispatch<SetStateAction<boolean>>;
	spanGaps: boolean | number;
	setSpanGaps: Dispatch<SetStateAction<boolean | number>>;
}

RightContainer.defaultProps = {
	selectedWidget: undefined,
	queryResponse: null,
	enableDrillDown: false,
};

export default RightContainer;
