/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import { Color } from '@signozhq/design-tokens';
import { Card, Tooltip, Typography } from 'antd';
import { ColumnsType } from 'antd/es/table';
import { InspectMetricsSeries } from 'api/metricsExplorer/getInspectMetricsDetails';
import classNames from 'classnames';
import ResizeTable from 'components/ResizeTable/ResizeTable';
import { DataType } from 'container/LogDetailedView/TableView';
import { Focus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { ExpandedViewProps, InspectionStep } from './types';
import {
	formatTimestampToFullDateTime,
	getRawDataFromTimeSeries,
	getSpaceAggregatedDataFromTimeSeries,
} from './utils';

function ExpandedView({
	options,
	spaceAggregationSeriesMap,
	step,
}: ExpandedViewProps): JSX.Element {
	const [
		selectedTimeSeries,
		setSelectedTimeSeries,
	] = useState<InspectMetricsSeries | null>(null);

	useEffect(() => {
		if (step !== InspectionStep.COMPLETED) {
			setSelectedTimeSeries(options?.timeSeries ?? null);
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
		);
	}, [options?.timeSeries, options?.timestamp, spaceAggregationSeriesMap, step]);

	const rawData = useMemo(() => {
		if (!selectedTimeSeries || !options?.timestamp) {
			return [];
		}
		return getRawDataFromTimeSeries(selectedTimeSeries, options?.timestamp);
	}, [selectedTimeSeries, options?.timestamp]);

	const absoluteValue = useMemo(
		() =>
			options?.timeSeries.values.find(
				(value) => value.timestamp >= options?.timestamp,
			)?.value ?? options?.value,
		[options],
	);

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
			{step === InspectionStep.COMPLETED && (
				<div className="graph-popover">
					<Card className="graph-popover-card" size="small">
						{/* Header */}
						<Typography.Text className="graph-popover-header-text">
							{formatTimestampToFullDateTime(options?.timestamp ?? 0)}
						</Typography.Text>
						<div className="graph-popover-row">
							<div className="graph-popover-inner-row">
								<div
									style={{
										width: 10,
										height: 10,
										backgroundColor: options?.timeSeries?.strokeColor,
										borderRadius: '50%',
										marginRight: 8,
									}}
								/>
								<Typography.Text>{options?.timeSeries?.title}</Typography.Text>
							</div>
							<Typography.Text strong>
								{Number(absoluteValue).toFixed(2)}
							</Typography.Text>
						</div>

						{/* Table */}
						<div className="graph-popover-row">
							<Typography.Text className="graph-popover-row-label">
								VALUES
							</Typography.Text>
							<div className="graph-popover-inner-row">
								{spaceAggregatedData?.map(({ value }) => (
									<Tooltip key={value} title={value}>
										<div className="graph-popover-cell">{value}</div>
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
											className={classNames('graph-popover-cell', 'timeseries-cell', {
												selected: title === selectedTimeSeries?.title,
											})}
											onClick={(): void => {
												setSelectedTimeSeries(timeSeries ?? null);
											}}
										>
											{title}
										</div>
									</Tooltip>
								))}
							</div>
						</div>
					</Card>
				</div>
			)}

			{selectedTimeSeries && (
				<div className="graph-popover">
					<Card className="graph-popover-card" size="small">
						{/* Header */}
						{step !== InspectionStep.COMPLETED && (
							<Typography.Text className="graph-popover-header-text">
								{formatTimestampToFullDateTime(options?.timestamp ?? 0)}
							</Typography.Text>
						)}
						<div className="graph-popover-row">
							<div className="graph-popover-inner-row">
								<div
									style={{
										width: 10,
										height: 10,
										backgroundColor: selectedTimeSeries?.strokeColor,
										borderRadius: '50%',
										marginRight: 8,
									}}
								/>
								<Typography.Text>{selectedTimeSeries?.title}</Typography.Text>
							</div>
							<Typography.Text strong>
								{Number(
									selectedTimeSeries?.values.find(
										(value) => value?.timestamp >= (options?.timestamp || 0),
									)?.value ?? options?.value,
								).toLocaleString()}
							</Typography.Text>
						</div>

						{/* Table */}
						<div className="graph-popover-row">
							<Typography.Text className="graph-popover-row-label">
								RAW VALUES
							</Typography.Text>
							<div className="graph-popover-inner-row">
								{rawData?.map(({ value: rawValue }) => (
									<Tooltip key={rawValue} title={rawValue}>
										<div className="graph-popover-cell">{rawValue}</div>
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
										<div className="graph-popover-cell">
											{formatTimestampToFullDateTime(timestamp ?? '', true)}
										</div>
									</Tooltip>
								))}
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
