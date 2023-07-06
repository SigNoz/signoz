import { ExpandAltOutlined } from '@ant-design/icons';
import Convert from 'ansi-to-html';
import { Typography } from 'antd';
import { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import dompurify from 'dompurify';
import { FlatLogData } from 'lib/logs/flatLogData';
import { useMemo } from 'react';
import { ILog } from 'types/api/logs/log';

import { ExpandIconWrapper } from '../RawLogView/styles';
import { defaultCellStyle, defaultTableStyle } from './config';
import { TableBodyContent } from './styles';
import {
	ColumnTypeRender,
	UseTableViewProps,
	UseTableViewResult,
} from './types';

const convert = new Convert();

export const useTableView = (props: UseTableViewProps): UseTableViewResult => {
	const {
		logs,
		fields,
		linesPerRow,
		onClickExpand,
		appendTo = 'center',
	} = props;

	const flattenLogData = useMemo(() => logs.map((log) => FlatLogData(log)), [
		logs,
	]);

	const columns: ColumnsType<Record<string, unknown>> = useMemo(() => {
		const fieldColumns: ColumnsType<Record<string, unknown>> = fields
			.filter((e) => e.name !== 'id')
			.map(({ name }) => ({
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
			}));

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
				title: 'timestamp',
				dataIndex: 'timestamp',
				key: 'timestamp',
				// https://github.com/ant-design/ant-design/discussions/36886
				render: (field): ColumnTypeRender<Record<string, unknown>> => {
					const date =
						typeof field === 'string'
							? dayjs(field).format()
							: dayjs(field / 1e6).format();
					return {
						children: <Typography.Paragraph ellipsis>{date}</Typography.Paragraph>,
					};
				},
			},
			...(appendTo === 'center' ? fieldColumns : []),
			{
				title: 'body',
				dataIndex: 'body',
				key: 'body',
				render: (field): ColumnTypeRender<Record<string, unknown>> => ({
					props: {
						style: defaultTableStyle,
					},
					children: (
						<TableBodyContent
							dangerouslySetInnerHTML={{
								__html: convert.toHtml(dompurify.sanitize(field)),
							}}
							linesPerRow={linesPerRow}
						/>
					),
				}),
			},
			...(appendTo === 'end' ? fieldColumns : []),
		];
	}, [fields, linesPerRow, appendTo, onClickExpand]);

	return { columns, dataSource: flattenLogData };
};
