/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/require-default-props */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable prefer-destructuring */

import { Color } from '@signozhq/design-tokens';
import { Tooltip, Typography } from 'antd';
import Table, { ColumnsType } from 'antd/es/table';
import { Progress } from 'antd/lib';
import { ResizeTable } from 'components/ResizeTable';
import FieldRenderer from 'container/LogDetailedView/FieldRenderer';
import { DataType } from 'container/LogDetailedView/TableView';
import { useMemo } from 'react';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';

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

export function EntityProgressBar({
	value,
	type,
}: {
	value: number;
	type: 'request' | 'limit';
}): JSX.Element {
	const percentage = Number((value * 100).toFixed(1));

	return (
		<div className="entity-progress-bar">
			<Progress
				percent={percentage}
				strokeLinecap="butt"
				size="small"
				status="normal"
				strokeColor={
					type === 'limit'
						? getStrokeColorForLimitUtilization(value)
						: getStrokeColorForRequestUtilization(value)
				}
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

export const getMetricsTableData = (data: any): any[] => {
	if (data?.params && data?.payload?.data?.result?.length) {
		const rowsData = (data?.payload.data.result[0] as any).table.rows;
		const columnsData = (data?.payload.data.result[0] as any).table.columns;
		const builderQueries = data.params?.compositeQuery?.builderQueries;
		const columns = columnsData.map((columnData: any) => {
			console.log({ columnData });
			if (columnData.isValueColumn) {
				return {
					key: columnData.name,
					label: builderQueries[columnData.name].legend,
					isValueColumn: true,
				};
			}
			return {
				key: columnData.name,
				label: columnData.name,
				isValueColumn: false,
			};
		});

		const rows = rowsData.map((rowData: any) => rowData.data);
		return [{ rows, columns }];
	}
	return [{ rows: [], columns: [] }];
};

export function MetricsTable({
	rows,
	columns,
}: {
	rows: any[];
	columns: any[];
}): JSX.Element {
	const columnsData = columns.map((col: any) => ({
		title: <Tooltip title={col.label}>{col.label}</Tooltip>,
		dataIndex: col.key,
		key: col.key,
		sorter: false,
		ellipsis: true,
		render: (value: string) => <Tooltip title={value}>{value}</Tooltip>,
	}));

	return (
		<div className="metrics-table">
			<Table
				dataSource={rows}
				columns={columnsData}
				tableLayout="fixed"
				pagination={{ pageSize: 10, showSizeChanger: false }}
				scroll={{ y: 180 }}
				sticky
			/>
		</div>
	);
}

export const filterDuplicateFilters = (
	filters: TagFilterItem[],
): TagFilterItem[] => {
	const uniqueFilters = [];
	const seenIds = new Set();

	// eslint-disable-next-line no-restricted-syntax
	for (const filter of filters) {
		if (!seenIds.has(filter.id)) {
			seenIds.add(filter.id);
			uniqueFilters.push(filter);
		}
	}

	return uniqueFilters;
};
