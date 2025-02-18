/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import './RightContainer.styles.scss';

import { Input, InputNumber, Select, Space, Switch, Typography } from 'antd';
import TimePreference from 'components/TimePreferenceDropDown';
import { PANEL_TYPES, PanelDisplay } from 'constants/queryBuilder';
import GraphTypes, {
	ItemsProps,
} from 'container/NewDashboard/ComponentsSlider/menuItems';
import useCreateAlerts from 'hooks/queryBuilder/useCreateAlerts';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { ConciergeBell, Plus } from 'lucide-react';
import {
	Dispatch,
	SetStateAction,
	useCallback,
	useEffect,
	useState,
} from 'react';
import { ColumnUnit, Widgets } from 'types/api/dashboard/getAll';
import { DataSource } from 'types/common/queryBuilder';

import { ColumnUnitSelector } from './ColumnUnitSelector/ColumnUnitSelector';
import {
	panelTypeVsBucketConfig,
	panelTypeVsColumnUnitPreferences,
	panelTypeVsCreateAlert,
	panelTypeVsFillSpan,
	panelTypeVsPanelTimePreferences,
	panelTypeVsSoftMinMax,
	panelTypeVsStackingChartPreferences,
	panelTypeVsThreshold,
	panelTypeVsYAxisUnit,
} from './constants';
import ThresholdSelector from './Threshold/ThresholdSelector';
import { ThresholdProps } from './Threshold/types';
import { timePreferance } from './timeItems';
import YAxisUnitSelector from './YAxisUnitSelector';

const { TextArea } = Input;
const { Option } = Select;

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
}: RightContainerProps): JSX.Element {
	const onChangeHandler = useCallback(
		(setFunc: Dispatch<SetStateAction<string>>, value: string) => {
			setFunc(value);
		},
		[],
	);

	const selectedGraphType =
		GraphTypes.find((e) => e.name === selectedGraph)?.display || '';

	const onCreateAlertsHandler = useCreateAlerts(selectedWidget, 'panelView');

	const allowThreshold = panelTypeVsThreshold[selectedGraph];
	const allowSoftMinMax = panelTypeVsSoftMinMax[selectedGraph];
	const allowFillSpans = panelTypeVsFillSpan[selectedGraph];
	const allowYAxisUnit = panelTypeVsYAxisUnit[selectedGraph];
	const allowCreateAlerts = panelTypeVsCreateAlert[selectedGraph];
	const allowBucketConfig = panelTypeVsBucketConfig[selectedGraph];
	const allowStackingBarChart =
		panelTypeVsStackingChartPreferences[selectedGraph];
	const allowPanelTimePreference =
		panelTypeVsPanelTimePreferences[selectedGraph];

	const allowPanelColumnPreference =
		panelTypeVsColumnUnitPreferences[selectedGraph];

	const { currentQuery } = useQueryBuilder();

	const [graphTypes, setGraphTypes] = useState<ItemsProps[]>(GraphTypes);

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
				<Input
					placeholder="Enter the panel name here..."
					onChange={(event): void => onChangeHandler(setTitle, event.target.value)}
					value={title}
					rootClassName="name-input"
				/>
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
						defaultValue={yAxisUnit}
						onSelect={setYAxisUnit}
						fieldLabel={
							selectedGraphType === PanelDisplay.VALUE ||
							selectedGraphType === PanelDisplay.PIE
								? 'Unit'
								: 'Y Axis Unit'
						}
					/>
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
	stacked: boolean;
	setStacked: Dispatch<SetStateAction<boolean>>;
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
}

RightContainer.defaultProps = {
	selectedWidget: undefined,
};

export default RightContainer;
