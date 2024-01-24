import './useTableView.styles.scss';

import Convert from 'ansi-to-html';
import { Typography } from 'antd';
import { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import dompurify from 'dompurify';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { FlatLogData } from 'lib/logs/flatLogData';
import { defaultTo } from 'lodash-es';
import { useMemo } from 'react';

import LogStateIndicator, {
	LogType,
} from '../LogStateIndicator/LogStateIndicator';
import { defaultTableStyle, getDefaultCellStyle } from './config';
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
		appendTo = 'center',
		activeContextLog,
		activeLog,
	} = props;

	const isDarkMode = useIsDarkMode();

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
						style: getDefaultCellStyle(isDarkMode),
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
				title: 'timestamp',
				dataIndex: 'timestamp',
				key: 'timestamp',
				// https://github.com/ant-design/ant-design/discussions/36886
				render: (field, item): ColumnTypeRender<Record<string, unknown>> => {
					const date =
						typeof field === 'string'
							? dayjs(field).format()
							: dayjs(field / 1e6).format();
					return {
						children: (
							<div className="table-timestamp">
								<LogStateIndicator
									type={defaultTo(item.log_level, LogType.INFO) as string}
									isActive={
										activeLog?.id === item.id || activeContextLog?.id === item.id
									}
								/>
								<Typography.Paragraph ellipsis className="text">
									{date}
								</Typography.Paragraph>
							</div>
						),
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
							isDarkMode={isDarkMode}
						/>
					),
				}),
			},
			...(appendTo === 'end' ? fieldColumns : []),
		];
	}, [
		fields,
		appendTo,
		isDarkMode,
		linesPerRow,
		activeLog?.id,
		activeContextLog?.id,
	]);

	return { columns, dataSource: flattenLogData };
};
