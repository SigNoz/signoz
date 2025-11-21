/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import './RightContainer.styles.scss';

import type { InputRef } from 'antd';
import {
	AutoComplete,
	Input,
	InputNumber,
	Select,
	Space,
	Switch,
	Typography,
} from 'antd';
import {
	PrecisionOption,
	PrecisionOptionsEnum,
} from 'components/Graph/yAxisConfig';
import TimePreference from 'components/TimePreferenceDropDown';
import { PANEL_TYPES, PanelDisplay } from 'constants/queryBuilder';
import GraphTypes, {
	ItemsProps,
} from 'container/NewDashboard/ComponentsSlider/menuItems';
import useCreateAlerts from 'hooks/queryBuilder/useCreateAlerts';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { ConciergeBell, LineChart, Plus, Spline } from 'lucide-react';
import { useDashboard } from 'providers/Dashboard/Dashboard';
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
import LegendColors from './LegendColors/LegendColors';
import ThresholdSelector from './Threshold/ThresholdSelector';
import { ThresholdProps } from './Threshold/types';
import { timePreferance } from './timeItems';
import YAxisUnitSelector from './YAxisUnitSelector';

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
}: RightContainerProps): JSX.Element {
	const { selectedDashboard } = useDashboard();
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
		GraphTypes.find((e) => e.name === selectedGraph)?.display || '';

	const onCreateAlertsHandler = useCreateAlerts(
		selectedWidget,
		'panelView',
		thresholds,
	);

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

	const [graphTypes, setGraphTypes] = useState<ItemsProps[]>(GraphTypes);

	// Get dashboard variables
	const dashboardVariables = useMemo<VariableOption[]>(() => {
		if (!selectedDashboard?.data?.variables) return [];
		return Object.entries(selectedDashboard.data.variables).map(([, value]) => ({
			value: value.name || '',
			label: value.name || '',
		}));
	}, [selectedDashboard?.data?.variables]);

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
		if (lastDollar === -1) return false;
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
			setGraphTypes(GraphTypes);
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
				<Typography.Text className="header-text">Panel details</Typography.Text>
			</section>
			<section className="name-description">
				<Typography.Text className="typography">Name</Typography.Text>
				<AutoComplete
					options={dashboardVariables}
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
			<section className="panel-config">
				<Typography.Text className="typography">Panel Type</Typography.Text>
				<Select
					onChange={setGraphHandler}
					value={selectedGraph}
					style={{ width: '100%' }}
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

				{allowFillSpans && (
					<Space className="fill-gaps">
						<Typography className="fill-gaps-text">Fill gaps</Typography>
						<Switch
							checked={isFillSpans}
							size="small"
							onChange={(checked): void => setIsFillSpans(checked)}
						/>
					</Space>
				)}

				{allowPanelTimePreference && (
					<>
						<Typography.Text className="panel-time-text">
							Panel Time Preference
						</Typography.Text>
						<TimePreference
							{...{
								selectedTime,
								setSelectedTime,
							}}
						/>
					</>
				)}

				{allowPanelColumnPreference && (
					<ColumnUnitSelector
						columnUnits={columnUnits}
						setColumnUnits={setColumnUnits}
					/>
				)}

				{allowYAxisUnit && (
					<YAxisUnitSelector
						onSelect={setYAxisUnit}
						value={yAxisUnit || ''}
						fieldLabel={
							selectedGraphType === PanelDisplay.VALUE ||
							selectedGraphType === PanelDisplay.PIE
								? 'Unit'
								: 'Y Axis Unit'
						}
					/>
				)}

				{allowDecimalPrecision && (
					<section className="decimal-precision-selector">
						<Typography.Text className="typography">
							Decimal Precision
						</Typography.Text>
						<Select
							options={[
								{ label: '0 decimals', value: PrecisionOptionsEnum.ZERO },
								{ label: '1 decimal', value: PrecisionOptionsEnum.ONE },
								{ label: '2 decimals', value: PrecisionOptionsEnum.TWO },
								{ label: '3 decimals', value: PrecisionOptionsEnum.THREE },
								{ label: '4 decimals', value: PrecisionOptionsEnum.FOUR },
								{ label: 'Full Precision', value: PrecisionOptionsEnum.FULL },
							]}
							value={decimalPrecision}
							style={{ width: '100%' }}
							className="panel-type-select"
							defaultValue={PrecisionOptionsEnum.TWO}
							onChange={(val: PrecisionOption): void => setDecimalPrecision(val)}
						/>
					</section>
				)}

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

				{allowStackingBarChart && (
					<section className="stack-chart">
						<Typography.Text className="label">Stack series</Typography.Text>
						<Switch
							checked={stackedBarChart}
							size="small"
							onChange={(checked): void => setStackedBarChart(checked)}
						/>
					</section>
				)}

				{allowBucketConfig && (
					<section className="bucket-config">
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
				)}

				{allowLogScale && (
					<section className="log-scale">
						<Typography.Text className="typography">Y Axis Scale</Typography.Text>
						<Select
							onChange={(value): void => setIsLogScale(value === LogScale.LOGARITHMIC)}
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

				{allowLegendPosition && (
					<section className="legend-position">
						<Typography.Text className="typography">Legend Position</Typography.Text>
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
			</section>

			{allowCreateAlerts && (
				<section className="alerts" onClick={onCreateAlertsHandler}>
					<div className="left-section">
						<ConciergeBell size={14} className="bell-icon" />
						<Typography.Text className="alerts-text">Alerts</Typography.Text>
					</div>
					<Plus size={14} className="plus-icon" />
				</section>
			)}

			{allowContextLinks && (
				<section className="context-links">
					<ContextLinks
						contextLinks={contextLinks}
						setContextLinks={setContextLinks}
						selectedWidget={selectedWidget}
					/>
				</section>
			)}

			{allowThreshold && (
				<section>
					<ThresholdSelector
						thresholds={thresholds}
						setThresholds={setThresholds}
						yAxisUnit={yAxisUnit}
						selectedGraph={selectedGraph}
						columnUnits={columnUnits}
					/>
				</section>
			)}
		</div>
	);
}

interface RightContainerProps {
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
}

RightContainer.defaultProps = {
	selectedWidget: undefined,
	queryResponse: null,
	enableDrillDown: false,
};

export default RightContainer;
