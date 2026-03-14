import {
	Dispatch,
	SetStateAction,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { UseQueryResult } from 'react-query';
import type { InputRef } from 'antd';
import {
	AutoComplete,
	Input,
	InputNumber,
	Select,
	Switch,
	Typography,
} from 'antd';
import { PrecisionOption, PrecisionOptionsEnum } from 'components/Graph/types';
import TimePreference from 'components/TimePreferenceDropDown';
import { PANEL_TYPES, PanelDisplay } from 'constants/queryBuilder';
import {
	ItemsProps,
	PanelTypesWithData,
} from 'container/DashboardContainer/PanelTypeSelectionModal/menuItems';
import { useDashboardVariables } from 'hooks/dashboard/useDashboardVariables';
import useCreateAlerts from 'hooks/queryBuilder/useCreateAlerts';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import {
	Antenna,
	Axis3D,
	ConciergeBell,
	Layers,
	LayoutDashboard,
	LineChart,
	Link,
	Pencil,
	Plus,
	SlidersHorizontal,
	Spline,
	SquareArrowOutUpRight,
} from 'lucide-react';
import { SuccessResponse } from 'types/api';
import {
	ColumnUnit,
	ContextLinksData,
	LegendPosition,
	Widgets,
} from 'types/api/dashboard/getAll';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { DataSource } from 'types/common/queryBuilder';
import { popupContainer } from 'utils/selectPopupContainer';

import { ColumnUnitSelector } from './ColumnUnitSelector/ColumnUnitSelector';
import SettingsSection from './components/SettingsSection/SettingsSection';
import {
	panelTypeVsBucketConfig,
	panelTypeVsColumnUnitPreferences,
	panelTypeVsContextLinks,
	panelTypeVsCreateAlert,
	panelTypeVsDecimalPrecision,
	panelTypeVsFillSpan,
	panelTypeVsLegendColors,
	panelTypeVsLegendPosition,
	panelTypeVsLogScale,
	panelTypeVsPanelTimePreferences,
	panelTypeVsSoftMinMax,
	panelTypeVsStackingChartPreferences,
	panelTypeVsThreshold,
	panelTypeVsYAxisUnit,
} from './constants';
import ContextLinks from './ContextLinks';
import DashboardYAxisUnitSelectorWrapper from './DashboardYAxisUnitSelectorWrapper';
import LegendColors from './LegendColors/LegendColors';
import ThresholdSelector from './Threshold/ThresholdSelector';
import { ThresholdProps } from './Threshold/types';
import { timePreferance } from './timeItems';

import './RightContainer.styles.scss';

const { TextArea } = Input;
const { Option } = Select;

enum LogScale {
	LINEAR = 'linear',
	LOGARITHMIC = 'logarithmic',
}

interface VariableOption {
	value: string;
	label: string;
}

// eslint-disable-next-line sonarjs/cognitive-complexity
function RightContainer({
	description,
	setDescription,
	setTitle,
	title,
	selectedGraph,
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
	const [inputValue, setInputValue] = useState(title);
	const [autoCompleteOpen, setAutoCompleteOpen] = useState(false);
	const [cursorPos, setCursorPos] = useState(0);
	const inputRef = useRef<InputRef>(null);

	const onChangeHandler = useCallback(
		(setFunc: Dispatch<SetStateAction<string>>, value: string) => {
			setFunc(value);
		},
		[],
	);

	const selectedGraphType =
		PanelTypesWithData.find((e) => e.name === selectedGraph)?.display || '';

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

	const { currentQuery } = useQueryBuilder();

	const [graphTypes, setGraphTypes] = useState<ItemsProps[]>(PanelTypesWithData);

	const dashboardVariableOptions = useMemo<VariableOption[]>(() => {
		return Object.entries(dashboardVariables).map(([, value]) => ({
			value: value.name || '',
			label: value.name || '',
		}));
	}, [dashboardVariables]);

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

	const updateCursorAndDropdown = (value: string, pos: number): void => {
		setCursorPos(pos);
		const lastDollar = value.lastIndexOf('$', pos - 1);
		setAutoCompleteOpen(lastDollar !== -1 && pos >= lastDollar + 1);
	};

	const onInputChange = (value: string): void => {
		setInputValue(value);
		onChangeHandler(setTitle, value);
		setTimeout(() => {
			const pos = inputRef.current?.input?.selectionStart ?? 0;
			updateCursorAndDropdown(value, pos);
		}, 0);
	};

	const decimapPrecisionOptions = useMemo(() => {
		return [
			{ label: '0 decimals', value: PrecisionOptionsEnum.ZERO },
			{ label: '1 decimal', value: PrecisionOptionsEnum.ONE },
			{ label: '2 decimals', value: PrecisionOptionsEnum.TWO },
			{ label: '3 decimals', value: PrecisionOptionsEnum.THREE },
		];
	}, []);

	const handleInputCursor = (): void => {
		const pos = inputRef.current?.input?.selectionStart ?? 0;
		updateCursorAndDropdown(inputValue, pos);
	};

	const onSelect = (selectedValue: string): void => {
		const pos = cursorPos;
		const value = inputValue;
		const lastDollar = value.lastIndexOf('$', pos - 1);
		const textBeforeDollar = value.substring(0, lastDollar);
		const textAfterDollar = value.substring(lastDollar + 1);
		const match = textAfterDollar.match(/^([a-zA-Z0-9_.]*)/);
		const rest = textAfterDollar.substring(match ? match[1].length : 0);
		const newValue = `${textBeforeDollar}$${selectedValue}${rest}`;
		setInputValue(newValue);
		onChangeHandler(setTitle, newValue);
		setAutoCompleteOpen(false);
		setTimeout(() => {
			const newCursor = `${textBeforeDollar}$${selectedValue}`.length;
			inputRef.current?.input?.setSelectionRange(newCursor, newCursor);
			setCursorPos(newCursor);
		}, 0);
	};

	const filterOption = (
		inputValue: string,
		option?: VariableOption,
	): boolean => {
		const pos = cursorPos;
		const value = inputValue;
		const lastDollar = value.lastIndexOf('$', pos - 1);
		if (lastDollar === -1) {
			return false;
		}
		const afterDollar = value.substring(lastDollar + 1, pos).toLowerCase();
		return option?.value.toLowerCase().startsWith(afterDollar) || false;
	};

	useEffect(() => {
		const queryContainsMetricsDataSource = currentQuery.builder.queryData.some(
			(query) => query.dataSource === DataSource.METRICS,
		);

		if (queryContainsMetricsDataSource) {
			setGraphTypes((prev) =>
				prev.filter((graph) => graph.name !== PANEL_TYPES.LIST),
			);
		} else {
			setGraphTypes(PanelTypesWithData);
		}
	}, [currentQuery]);

	const softMinHandler = useCallback(
		(value: number | null) => {
			setSoftMin(value);
		},
		[setSoftMin],
	);

	const softMaxHandler = useCallback(
		(value: number | null) => {
			setSoftMax(value);
		},
		[setSoftMax],
	);

	return (
		<div className="right-container">
			<section className="header">
				<div className="purple-dot" />
				<Typography.Text className="header-text">Panel Settings</Typography.Text>
			</section>

			<SettingsSection title="General" defaultOpen icon={<Pencil size={14} />}>
				<section className="name-description control-container">
					<Typography.Text className="typography">Name</Typography.Text>
					<AutoComplete
						options={dashboardVariableOptions}
						value={inputValue}
						onChange={onInputChange}
						onSelect={onSelect}
						filterOption={filterOption}
						style={{ width: '100%' }}
						getPopupContainer={popupContainer}
						placeholder="Enter the panel name here..."
						open={autoCompleteOpen}
					>
						<Input
							rootClassName="name-input"
							ref={inputRef}
							onSelect={handleInputCursor}
							onClick={handleInputCursor}
							onBlur={(): void => setAutoCompleteOpen(false)}
						/>
					</AutoComplete>
					<Typography.Text className="typography">Description</Typography.Text>
					<TextArea
						placeholder="Enter the panel description here..."
						bordered
						allowClear
						value={description}
						onChange={(event): void =>
							onChangeHandler(setDescription, event.target.value)
						}
						rootClassName="description-input"
					/>
				</section>
			</SettingsSection>

			<section className="panel-config">
				<SettingsSection
					title="Visualization"
					defaultOpen
					icon={<LayoutDashboard size={14} />}
				>
					<section className="panel-type control-container">
						<Typography.Text className="typography">Panel Type</Typography.Text>
						<Select
							onChange={setGraphHandler}
							value={selectedGraph}
							className="panel-type-select"
							data-testid="panel-change-select"
							data-stacking-state={stackedBarChart ? 'true' : 'false'}
						>
							{graphTypes.map((item) => (
								<Option key={item.name} value={item.name}>
									<div className="select-option">
										<div className="icon">{item.icon}</div>
										<Typography.Text className="display">{item.display}</Typography.Text>
									</div>
								</Option>
							))}
						</Select>
					</section>

					{allowPanelTimePreference && (
						<section className="panel-time-preference control-container">
							<Typography.Text className="panel-time-text">
								Panel Time Preference
							</Typography.Text>
							<TimePreference
								{...{
									selectedTime,
									setSelectedTime,
								}}
							/>
						</section>
					)}

					{allowStackingBarChart && (
						<section className="stack-chart control-container">
							<Typography.Text className="label">Stack series</Typography.Text>
							<Switch
								checked={stackedBarChart}
								size="small"
								onChange={(checked): void => setStackedBarChart(checked)}
							/>
						</section>
					)}

					{allowFillSpans && (
						<section className="fill-gaps">
							<div className="fill-gaps-text-container">
								<Typography className="fill-gaps-text">Fill gaps</Typography>
								<Typography.Text className="fill-gaps-text-description">
									Fill gaps in data with 0 for continuity
								</Typography.Text>
							</div>
							<Switch
								checked={isFillSpans}
								size="small"
								onChange={(checked): void => setIsFillSpans(checked)}
							/>
						</section>
					)}
				</SettingsSection>

				{isFormattingSectionVisible && (
					<SettingsSection
						title="Formatting & Units"
						icon={<SlidersHorizontal size={14} />}
					>
						{allowYAxisUnit && (
							<DashboardYAxisUnitSelectorWrapper
								onSelect={setYAxisUnit}
								value={yAxisUnit || ''}
								fieldLabel={
									selectedGraphType === PanelDisplay.VALUE ||
									selectedGraphType === PanelDisplay.PIE
										? 'Unit'
										: 'Y Axis Unit'
								}
								// Only update the y-axis unit value automatically in create mode
								shouldUpdateYAxisUnit={isNewDashboard}
							/>
						)}

						{allowDecimalPrecision && (
							<section className="decimal-precision-selector control-container">
								<Typography.Text className="typography">
									Decimal Precision
								</Typography.Text>
								<Select
									options={decimapPrecisionOptions}
									value={decimalPrecision}
									style={{ width: '100%' }}
									className="panel-type-select"
									defaultValue={PrecisionOptionsEnum.TWO}
									onChange={(val: PrecisionOption): void => setDecimalPrecision(val)}
								/>
							</section>
						)}

						{allowPanelColumnPreference && (
							<ColumnUnitSelector
								columnUnits={columnUnits}
								setColumnUnits={setColumnUnits}
								isNewDashboard={isNewDashboard}
							/>
						)}
					</SettingsSection>
				)}

				{isAxisSectionVisible && (
					<SettingsSection title="Axes" icon={<Axis3D size={14} />}>
						{allowSoftMinMax && (
							<section className="soft-min-max">
								<section className="container">
									<Typography.Text className="text">Soft Min</Typography.Text>
									<InputNumber
										type="number"
										value={softMin}
										onChange={softMinHandler}
										rootClassName="input"
									/>
								</section>
								<section className="container">
									<Typography.Text className="text">Soft Max</Typography.Text>
									<InputNumber
										value={softMax}
										type="number"
										rootClassName="input"
										onChange={softMaxHandler}
									/>
								</section>
							</section>
						)}

						{allowLogScale && (
							<section className="log-scale control-container">
								<Typography.Text className="typography">Y Axis Scale</Typography.Text>
								<Select
									onChange={(value): void =>
										setIsLogScale(value === LogScale.LOGARITHMIC)
									}
									value={isLogScale ? LogScale.LOGARITHMIC : LogScale.LINEAR}
									style={{ width: '100%' }}
									className="panel-type-select"
									defaultValue={LogScale.LINEAR}
								>
									<Option value={LogScale.LINEAR}>
										<div className="select-option">
											<div className="icon">
												<LineChart size={16} />
											</div>
											<Typography.Text className="display">Linear</Typography.Text>
										</div>
									</Option>
									<Option value={LogScale.LOGARITHMIC}>
										<div className="select-option">
											<div className="icon">
												<Spline size={16} />
											</div>
											<Typography.Text className="display">Logarithmic</Typography.Text>
										</div>
									</Option>
								</Select>
							</section>
						)}
					</SettingsSection>
				)}

				{isLegendSectionVisible && (
					<SettingsSection title="Legend" icon={<Layers size={14} />}>
						{allowLegendPosition && (
							<section className="legend-position control-container">
								<Typography.Text className="typography">Position</Typography.Text>
								<Select
									onChange={(value: LegendPosition): void => setLegendPosition(value)}
									value={legendPosition}
									style={{ width: '100%' }}
									className="panel-type-select"
									defaultValue={LegendPosition.BOTTOM}
								>
									<Option value={LegendPosition.BOTTOM}>
										<div className="select-option">
											<Typography.Text className="display">Bottom</Typography.Text>
										</div>
									</Option>
									<Option value={LegendPosition.RIGHT}>
										<div className="select-option">
											<Typography.Text className="display">Right</Typography.Text>
										</div>
									</Option>
								</Select>
							</section>
						)}

						{allowLegendColors && (
							<section className="legend-colors">
								<LegendColors
									customLegendColors={customLegendColors}
									setCustomLegendColors={setCustomLegendColors}
									queryResponse={queryResponse}
								/>
							</section>
						)}
					</SettingsSection>
				)}

				{allowBucketConfig && (
					<SettingsSection title="Histogram / Buckets">
						<section className="bucket-config control-container">
							<Typography.Text className="label">Number of buckets</Typography.Text>
							<InputNumber
								value={bucketCount || null}
								type="number"
								min={0}
								rootClassName="bucket-input"
								placeholder="Default: 30"
								onChange={(val): void => {
									setBucketCount(val || 0);
								}}
							/>
							<Typography.Text className="label bucket-size-label">
								Bucket width
							</Typography.Text>
							<InputNumber
								value={bucketWidth || null}
								type="number"
								precision={2}
								placeholder="Default: Auto"
								step={0.1}
								min={0.0}
								rootClassName="bucket-input"
								onChange={(val): void => {
									setBucketWidth(val || 0);
								}}
							/>
							<section className="combine-hist">
								<Typography.Text className="label">
									Merge all series into one
								</Typography.Text>
								<Switch
									checked={combineHistogram}
									size="small"
									onChange={(checked): void => setCombineHistogram(checked)}
								/>
							</section>
						</section>
					</SettingsSection>
				)}
			</section>

			{allowCreateAlerts && (
				<section className="alerts" onClick={onCreateAlertsHandler}>
					<div className="left-section">
						<ConciergeBell size={14} className="bell-icon" />
						<Typography.Text className="alerts-text">Alerts</Typography.Text>
						<SquareArrowOutUpRight size={10} className="info-icon" />
					</div>
					<Plus size={14} className="plus-icon" />
				</section>
			)}

			{allowContextLinks && (
				<SettingsSection
					title="Context Links"
					icon={<Link size={14} />}
					defaultOpen={!!contextLinks.linksData.length}
				>
					<ContextLinks
						contextLinks={contextLinks}
						setContextLinks={setContextLinks}
						selectedWidget={selectedWidget}
					/>
				</SettingsSection>
			)}

			{allowThreshold && (
				<SettingsSection
					title="Thresholds"
					icon={<Antenna size={14} />}
					defaultOpen={!!thresholds.length}
				>
					<ThresholdSelector
						thresholds={thresholds}
						setThresholds={setThresholds}
						yAxisUnit={yAxisUnit}
						selectedGraph={selectedGraph}
						columnUnits={columnUnits}
					/>
				</SettingsSection>
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
}

RightContainer.defaultProps = {
	selectedWidget: undefined,
	queryResponse: null,
	enableDrillDown: false,
};

export default RightContainer;
