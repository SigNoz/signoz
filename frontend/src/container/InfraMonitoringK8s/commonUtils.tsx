/* eslint-disable react/require-default-props */
/* eslint-disable @typescript-eslint/explicit-function-return-type */

import { Color } from '@signozhq/design-tokens';
import { Tooltip, Typography } from 'antd';
import { ColumnsType } from 'antd/es/table';
import { Progress } from 'antd/lib';
import { ResizeTable } from 'components/ResizeTable';
import FieldRenderer from 'container/LogDetailedView/FieldRenderer';
import { DataType } from 'container/LogDetailedView/TableView';
import { useMemo } from 'react';

import { getInvalidValueTooltipText, K8sCategory } from './constants';

/**
 * Converts size in bytes to a human-readable string with appropriate units
 */
export function formatBytes(bytes: number, decimals = 2): string {
	if (bytes === 0) return '0 Bytes';

	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return `${parseFloat((bytes / k ** i).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * Wrapper component that renders its children for valid values or renders '-' for invalid values (-1)
 */
export function ValidateColumnValueWrapper({
	children,
	value,
	entity,
	attribute,
}: {
	children: React.ReactNode;
	value: number;
	entity?: K8sCategory;
	attribute?: string;
}): JSX.Element {
	if (value === -1) {
		let element = <div>-</div>;
		if (entity && attribute) {
			element = (
				<Tooltip title={getInvalidValueTooltipText(entity, attribute)}>
					{element}
				</Tooltip>
			);
		}

		return element;
	}

	return <div>{children}</div>;
}

/**
 * Returns stroke color for request utilization parameters according to current value
 */
export function getStrokeColorForRequestUtilization(value: number): string {
	const percent = Number((value * 100).toFixed(1));
	// Orange
	if (percent <= 50) {
		return Color.BG_AMBER_500;
	}
	// Green
	if (percent > 50 && percent <= 100) {
		return Color.BG_FOREST_500;
	}
	// Regular Red
	if (percent > 100 && percent <= 150) {
		return Color.BG_SAKURA_500;
	}
	// Dark Red
	return Color.BG_CHERRY_600;
}

/**
 * Returns stroke color for limit utilization parameters according to current value
 */
export function getStrokeColorForLimitUtilization(value: number): string {
	const percent = Number((value * 100).toFixed(1));
	// Green
	if (percent <= 60) {
		return Color.BG_FOREST_500;
	}
	// Yellow
	if (percent > 60 && percent <= 80) {
		return Color.BG_AMBER_200;
	}
	// Orange
	if (percent > 80 && percent <= 95) {
		return Color.BG_AMBER_500;
	}
	// Red
	return Color.BG_SAKURA_500;
}

export const getProgressBarText = (percent: number): React.ReactNode =>
	`${percent}%`;

export function EntityProgressBar({ value }: { value: number }): JSX.Element {
	const percentage = Number((value * 100).toFixed(1));

	return (
		<div className="entity-progress-bar">
			<Progress
				percent={percentage}
				strokeLinecap="butt"
				size="small"
				status="normal"
				strokeColor={getStrokeColorForLimitUtilization(value)}
				className="progress-bar"
				showInfo={false}
			/>
			<Typography.Text style={{ fontSize: '10px' }}>{percentage}%</Typography.Text>
		</div>
	);
}

export function EventContents({
	data,
}: {
	data: Record<string, string> | undefined;
}): JSX.Element {
	const tableData = useMemo(
		() =>
			data ? Object.keys(data).map((key) => ({ key, value: data[key] })) : [],
		[data],
	);

	const columns: ColumnsType<DataType> = [
		{
			title: 'Key',
			dataIndex: 'key',
			key: 'key',
			width: 50,
			align: 'left',
			className: 'attribute-pin value-field-container',
			render: (field: string): JSX.Element => <FieldRenderer field={field} />,
		},
		{
			title: 'Value',
			dataIndex: 'value',
			key: 'value',
			width: 50,
			align: 'left',
			ellipsis: true,
			className: 'attribute-name',
			render: (field: string): JSX.Element => <FieldRenderer field={field} />,
		},
	];

	return (
		<ResizeTable
			columns={columns}
			tableLayout="fixed"
			dataSource={tableData}
			pagination={false}
			showHeader={false}
			className="event-content-container"
		/>
	);
}
