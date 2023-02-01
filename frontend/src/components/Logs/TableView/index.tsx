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
import { ExpandIconWrapper } from './styles';

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
		const defaultCellStyle: React.CSSProperties = {
			paddingTop: 4,
			paddingBottom: 6,
			paddingRight: 8,
			paddingLeft: 8,
		};

		const fieldColumns: ColumnsType<Record<string, unknown>> = fields.map(
			({ name }) => {
				return {
					title: name,
					dataIndex: name,
					key: name,
					render: (field): ColumnTypeRender<Record<string, unknown>> => {
						return {
							props: {
								style: defaultCellStyle,
							},
							children: (
								<Typography.Paragraph
									style={{ marginBottom: 0 }}
									ellipsis={{ rows: linesPerRow, tooltip: true }}
								>
									{field}
								</Typography.Paragraph>
							),
						};
					},
				};
			},
		);

		return [
			{
				title: '',
				dataIndex: 'id',
				key: 'expand',
				width: 30,
				render: (_, item): ColumnTypeRender<Record<string, unknown>> => {
					return {
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
					};
				},
			},
			{
				title: 'Timestamp',
				dataIndex: 'timestamp',
				key: 'timestamp',
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
			scroll={{ x: true }}
		/>
	);
}

export default LogsTableView;
