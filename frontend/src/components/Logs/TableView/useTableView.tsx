import {
	ExpandAltOutlined,
	LinkOutlined,
	MonitorOutlined,
} from '@ant-design/icons';
import Convert from 'ansi-to-html';
import { Button, Space, Typography } from 'antd';
import { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import dompurify from 'dompurify';
import { useCopyLogLink } from 'hooks/logs/useCopyLogLink';
import { FlatLogData } from 'lib/logs/flatLogData';
import { useCallback, useMemo } from 'react';

import { ExpandIconWrapper } from '../RawLogView/styles';
import { defaultCellStyle, defaultTableStyle } from './config';
import { TableBodyContent } from './styles';
import {
	ActionsColumnProps,
	ColumnTypeRender,
	UseTableViewProps,
	UseTableViewResult,
} from './types';

const convert = new Convert();

function ActionsColumn({
	logId,
	logs,
	onOpenLogsContext,
}: ActionsColumnProps): JSX.Element {
	const currentLog = useMemo(() => logs.find(({ id }) => id === logId), [
		logs,
		logId,
	]);

	const { onLogCopy } = useCopyLogLink(currentLog?.id);

	const handleShowContext = useCallback(() => {
		if (!onOpenLogsContext || !currentLog) return;

		onOpenLogsContext(currentLog);
	}, [currentLog, onOpenLogsContext]);

	return (
		<Space>
			<Button
				size="small"
				onClick={handleShowContext}
				icon={<MonitorOutlined />}
			/>
			<Button size="small" onClick={onLogCopy} icon={<LinkOutlined />} />
		</Space>
	);
}

export const useTableView = (props: UseTableViewProps): UseTableViewResult => {
	const {
		logs,
		fields,
		linesPerRow,
		appendTo = 'center',
		onOpenLogsContext,
		onClickExpand,
	} = props;
	const { isLogsExplorerPage } = useCopyLogLink();

	const flattenLogData = useMemo(() => logs.map((log) => FlatLogData(log)), [
		logs,
	]);

	const handleClickExpand = useCallback(
		(index: number): void => {
			if (!onClickExpand) return;

			onClickExpand(logs[index]);
		},
		[logs, onClickExpand],
	);

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
				render: (_, item, index): ColumnTypeRender<Record<string, unknown>> => ({
					props: {
						style: defaultCellStyle,
					},
					children: (
						<ExpandIconWrapper
							onClick={(): void => {
								handleClickExpand(index);
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
			...(isLogsExplorerPage
				? ([
						{
							title: 'actions',
							dataIndex: 'actions',
							key: 'actions',
							render: (_, log): ColumnTypeRender<Record<string, unknown>> => ({
								children: (
									<ActionsColumn
										logId={(log.id as unknown) as string}
										logs={logs}
										onOpenLogsContext={onOpenLogsContext}
									/>
								),
							}),
						},
				  ] as ColumnsType<Record<string, unknown>>)
				: []),
		];
	}, [
		logs,
		fields,
		appendTo,
		linesPerRow,
		isLogsExplorerPage,
		handleClickExpand,
		onOpenLogsContext,
	]);

	return { columns, dataSource: flattenLogData };
};
