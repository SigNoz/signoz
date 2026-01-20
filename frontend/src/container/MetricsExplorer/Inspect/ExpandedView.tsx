/* eslint-disable sonarjs/no-identical-functions */
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import { Color } from '@signozhq/design-tokens';
import { Card, Tooltip, Typography } from 'antd';
import { ColumnsType } from 'antd/es/table';
import logEvent from 'api/common/logEvent';
import { InspectMetricsSeries } from 'api/metricsExplorer/getInspectMetricsDetails';
import classNames from 'classnames';
import ResizeTable from 'components/ResizeTable/ResizeTable';
import { DataType } from 'container/LogDetailedView/TableView';
import { ArrowDownCircle, ArrowRightCircle, Focus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { MetricsExplorerEventKeys, MetricsExplorerEvents } from '../events';
import {
	SPACE_AGGREGATION_OPTIONS_FOR_EXPANDED_VIEW,
	TIME_AGGREGATION_OPTIONS,
} from './constants';
import {
	ExpandedViewProps,
	InspectionStep,
	SpaceAggregationOptions,
	TimeAggregationOptions,
} from './types';
import {
	formatTimestampToFullDateTime,
	getRawDataFromTimeSeries,
	getSpaceAggregatedDataFromTimeSeries,
} from './utils';

function ExpandedView({
	options,
	spaceAggregationSeriesMap,
	step,
	metricInspectionOptions,
	timeAggregatedSeriesMap,
}: ExpandedViewProps): JSX.Element {
	const [
		selectedTimeSeries,
		setSelectedTimeSeries,
	] = useState<InspectMetricsSeries | null>(null);

	useEffect(() => {
		logEvent(MetricsExplorerEvents.InspectPointClicked, {
			[MetricsExplorerEventKeys.Modal]: 'inspect',
			[MetricsExplorerEventKeys.Filters]: metricInspectionOptions.filters,
			[MetricsExplorerEventKeys.TimeAggregationInterval]:
				metricInspectionOptions.timeAggregationInterval,
			[MetricsExplorerEventKeys.TimeAggregationOption]:
				metricInspectionOptions.timeAggregationOption,
			[MetricsExplorerEventKeys.SpaceAggregationOption]:
				metricInspectionOptions.spaceAggregationOption,
			[MetricsExplorerEventKeys.SpaceAggregationLabels]:
				metricInspectionOptions.spaceAggregationLabels,
		});
	}, [metricInspectionOptions]);

	useEffect(() => {
		if (step !== InspectionStep.COMPLETED) {
			setSelectedTimeSeries(options?.timeSeries ?? null);
		} else {
			setSelectedTimeSeries(null);
		}
	}, [step, options?.timeSeries]);

	const spaceAggregatedData = useMemo(() => {
		if (
			!options?.timeSeries ||
			!options?.timestamp ||
			step !== InspectionStep.COMPLETED
		) {
			return [];
		}
		return getSpaceAggregatedDataFromTimeSeries(
			options?.timeSeries,
			spaceAggregationSeriesMap,
			options?.timestamp,
			true,
		);
	}, [options?.timeSeries, options?.timestamp, spaceAggregationSeriesMap, step]);

	const rawData = useMemo(() => {
		if (!selectedTimeSeries || !options?.timestamp) {
			return [];
		}
		return getRawDataFromTimeSeries(selectedTimeSeries, options?.timestamp, true);
	}, [selectedTimeSeries, options?.timestamp]);

	const absoluteValue = useMemo(
		() =>
			options?.timeSeries?.values.find(
				(value) => value.timestamp >= options?.timestamp,
			)?.value ?? options?.value,
		[options],
	);

	const timeAggregatedData = useMemo(() => {
		if (step !== InspectionStep.SPACE_AGGREGATION || !options?.timestamp) {
			return [];
		}
		return (
			timeAggregatedSeriesMap
				.get(options?.timestamp)
				?.filter(
					(popoverData) =>
						popoverData.title && popoverData.title === options.timeSeries?.title,
				) ?? []
		);
	}, [
		step,
		options?.timestamp,
		options?.timeSeries?.title,
		timeAggregatedSeriesMap,
	]);

	const tableData = useMemo(() => {
		if (!selectedTimeSeries) {
			return [];
		}
		return Object.entries(selectedTimeSeries.labels).map(([key, value]) => ({
			label: key,
			value,
		}));
	}, [selectedTimeSeries]);

	const columns: ColumnsType<DataType> = useMemo(
		() => [
			{
				title: 'Label',
				dataIndex: 'label',
				key: 'label',
				width: 50,
				align: 'left',
				className: 'labels-key',
			},
			{
				title: 'Value',
				dataIndex: 'value',
				key: 'value',
				width: 50,
				align: 'left',
				ellipsis: true,
				className: 'labels-value',
			},
		],
		[],
	);

	return (
		<div className="expanded-view">
			<div className="expanded-view-header">
				<Typography.Title level={5}>
					<Focus size={16} color={Color.BG_VANILLA_100} />
					<div>POINT INSPECTOR</div>
				</Typography.Title>
			</div>
			{/* Show only when space aggregation is completed */}
			{step === InspectionStep.COMPLETED && (
				<div className="graph-popover">
					<Card className="graph-popover-card" size="small">
						{/* Header */}
						<div className="graph-popover-row">
							<Typography.Text className="graph-popover-header-text">
								{formatTimestampToFullDateTime(options?.timestamp ?? 0)}
							</Typography.Text>
							<Typography.Text strong>
								{`${absoluteValue} is the ${
									SPACE_AGGREGATION_OPTIONS_FOR_EXPANDED_VIEW[
										metricInspectionOptions.spaceAggregationOption ??
											SpaceAggregationOptions.SUM_BY
									]
								} of`}
							</Typography.Text>
						</div>

						{/* Table */}
						<div className="graph-popover-section">
							<div className="graph-popover-row">
								<Typography.Text className="graph-popover-row-label">
									VALUES
								</Typography.Text>
								<div className="graph-popover-inner-row">
									{spaceAggregatedData?.map(({ value, title, timestamp }) => (
										<Tooltip key={`${title}-${timestamp}-${value}`} title={value}>
											<div className="graph-popover-cell" data-testid="graph-popover-cell">
												{value}
											</div>
										</Tooltip>
									))}
								</div>
							</div>
							<div className="graph-popover-row">
								<Typography.Text className="graph-popover-row-label">
									TIME SERIES
								</Typography.Text>
								<div className="graph-popover-inner-row">
									{spaceAggregatedData?.map(({ title, timeSeries }) => (
										<Tooltip key={title} title={title}>
											<div
												data-testid="graph-popover-cell"
												className={classNames('graph-popover-cell', 'timeseries-cell', {
													selected: title === selectedTimeSeries?.title,
												})}
												onClick={(): void => {
													setSelectedTimeSeries(timeSeries ?? null);
												}}
											>
												{title}
												{selectedTimeSeries?.title === title ? (
													<ArrowDownCircle color={Color.BG_FOREST_300} size={12} />
												) : (
													<ArrowRightCircle size={12} />
												)}
											</div>
										</Tooltip>
									))}
								</div>
							</div>
						</div>
					</Card>
				</div>
			)}
			{/* Show only for space aggregated or raw data */}
			{selectedTimeSeries && step !== InspectionStep.SPACE_AGGREGATION && (
				<div className="graph-popover">
					<Card className="graph-popover-card" size="small">
						{/* Header */}
						<div className="graph-popover-row">
							{step !== InspectionStep.COMPLETED && (
								<Typography.Text className="graph-popover-header-text">
									{formatTimestampToFullDateTime(options?.timestamp ?? 0)}
								</Typography.Text>
							)}
							<Typography.Text strong>
								{step === InspectionStep.COMPLETED
									? `${
											selectedTimeSeries?.values.find(
												(value) => value?.timestamp >= (options?.timestamp || 0),
											)?.value ?? options?.value
									  } is the ${
											TIME_AGGREGATION_OPTIONS[
												metricInspectionOptions.timeAggregationOption ??
													TimeAggregationOptions.SUM
											]
									  } of`
									: selectedTimeSeries?.values.find(
											(value) => value?.timestamp >= (options?.timestamp || 0),
									  )?.value ?? options?.value}
							</Typography.Text>
						</div>

						{/* Table */}
						<div className="graph-popover-section">
							<div className="graph-popover-row">
								<Typography.Text className="graph-popover-row-label">
									RAW VALUES
								</Typography.Text>
								<div className="graph-popover-inner-row">
									{rawData?.map(({ value: rawValue, timestamp, title }) => (
										<Tooltip key={`${title}-${timestamp}-${rawValue}`} title={rawValue}>
											<div className="graph-popover-cell" data-testid="graph-popover-cell">
												{rawValue}
											</div>
										</Tooltip>
									))}
								</div>
							</div>
							<div className="graph-popover-row">
								<Typography.Text className="graph-popover-row-label">
									TIMESTAMPS
								</Typography.Text>
								<div className="graph-popover-inner-row">
									{rawData?.map(({ timestamp }) => (
										<Tooltip
											key={timestamp}
											title={formatTimestampToFullDateTime(timestamp ?? '', true)}
										>
											<div className="graph-popover-cell" data-testid="graph-popover-cell">
												{formatTimestampToFullDateTime(timestamp ?? '', true)}
											</div>
										</Tooltip>
									))}
								</div>
							</div>
						</div>
					</Card>
				</div>
			)}
			{/* Show raw values breakdown only for time aggregated data */}
			{selectedTimeSeries && step === InspectionStep.SPACE_AGGREGATION && (
				<div className="graph-popover">
					<Card className="graph-popover-card" size="small">
						{/* Header */}
						<div className="graph-popover-row">
							<Typography.Text className="graph-popover-header-text">
								{formatTimestampToFullDateTime(options?.timestamp ?? 0)}
							</Typography.Text>
							<Typography.Text strong>
								{`${absoluteValue} is the ${
									TIME_AGGREGATION_OPTIONS[
										metricInspectionOptions.timeAggregationOption ??
											TimeAggregationOptions.SUM
									]
								} of`}
							</Typography.Text>
						</div>

						{/* Table */}
						<div className="graph-popover-section">
							<div className="graph-popover-row">
								<Typography.Text className="graph-popover-row-label">
									RAW VALUES
								</Typography.Text>
								<div className="graph-popover-inner-row">
									{timeAggregatedData?.map(({ value, title, timestamp }) => (
										<Tooltip key={`${title}-${timestamp}-${value}`} title={value}>
											<div className="graph-popover-cell" data-testid="graph-popover-cell">
												{value}
											</div>
										</Tooltip>
									))}
								</div>
							</div>
							<div className="graph-popover-row">
								<Typography.Text className="graph-popover-row-label">
									TIMESTAMPS
								</Typography.Text>
								<div className="graph-popover-inner-row">
									{timeAggregatedData?.map(({ timestamp }) => (
										<Tooltip
											key={timestamp}
											title={formatTimestampToFullDateTime(timestamp ?? '', true)}
										>
											<div className="graph-popover-cell" data-testid="graph-popover-cell">
												{formatTimestampToFullDateTime(timestamp ?? '', true)}
											</div>
										</Tooltip>
									))}
								</div>
							</div>
						</div>
					</Card>
				</div>
			)}
			{/* Labels */}
			{selectedTimeSeries && (
				<>
					<Typography.Title
						level={5}
					>{`${selectedTimeSeries?.title} Labels`}</Typography.Title>
					<ResizeTable
						columns={columns}
						tableLayout="fixed"
						dataSource={tableData}
						pagination={false}
						showHeader={false}
						scroll={{ y: 600 }}
						className="labels-table"
					/>
				</>
			)}
		</div>
	);
}

export default ExpandedView;
