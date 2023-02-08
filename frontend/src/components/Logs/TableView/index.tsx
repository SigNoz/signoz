import { ExpandAltOutlined } from '@ant-design/icons';
import { Table, Typography } from 'antd';
import { ColumnsType, ColumnType } from 'antd/es/table';
import dayjs from 'dayjs';
// utils
import { FlatLogData } from 'lib/logs/flatLogData';
import React, { useMemo } from 'react';
import { IField } from 'types/api/logs/fields';
// interfaces
import { ILog } from 'types/api/logs/log';

// styles
import { ExpandIconWrapper } from '../RawLogView/styles';
// config
import { defaultCellStyle, tableScroll } from './config';

type ColumnTypeRender<T = unknown> = ReturnType<
	NonNullable<ColumnType<T>['render']>
>;

type LogsTableViewProps = {
	logs: ILog[];
	fields: IField[];
	linesPerRow: number;
	onClickExpand: (log: ILog) => void;
};

function LogsTableView(props: LogsTableViewProps): JSX.Element {
	const { logs, fields, linesPerRow, onClickExpand } = props;

	const flattenLogData = useMemo(() => logs.map((log) => FlatLogData(log)), [
		logs,
	]);

	const columns: ColumnsType<Record<string, unknown>> = useMemo(() => {
		const fieldColumns: ColumnsType<Record<string, unknown>> = fields.map(
			({ name }) => ({
				title: name,
				dataIndex: name,
				key: name,
				render: (field): ColumnTypeRender<Record<string, unknown>> => ({
					props: {
						style: defaultCellStyle,
					},
					children: (
						<Typography.Paragraph ellipsis={{ rows: linesPerRow }}>
							{field}
						</Typography.Paragraph>
					),
				}),
			}),
		);

		return [
			{
				title: '',
				dataIndex: 'id',
				key: 'expand',
				// https://github.com/ant-design/ant-design/discussions/36886
				render: (_, item): ColumnTypeRender<Record<string, unknown>> => ({
					props: {
						style: defaultCellStyle,
					},
					children: (
						<ExpandIconWrapper
							onClick={(): void => {
								onClickExpand((item as unknown) as ILog);
							}}
						>
							<ExpandAltOutlined />
						</ExpandIconWrapper>
					),
				}),
			},
			{
				title: 'Timestamp',
				dataIndex: 'timestamp',
				key: 'timestamp',
				// https://github.com/ant-design/ant-design/discussions/36886
				render: (field): ColumnTypeRender<Record<string, unknown>> => {
					const date = dayjs(field / 1e6).format();
					return {
						props: {
							style: defaultCellStyle,
						},
						children: <span>{date}</span>,
					};
				},
			},
			...fieldColumns,
		];
	}, [fields, linesPerRow, onClickExpand]);

	return (
		<Table
			columns={columns}
			dataSource={flattenLogData}
			pagination={false}
			rowKey="id"
			bordered
			scroll={tableScroll}
		/>
	);
}

export default LogsTableView;
