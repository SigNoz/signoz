import {
	ExpandAltOutlined,
	LinkOutlined,
	MonitorOutlined,
} from '@ant-design/icons';
import Convert from 'ansi-to-html';
import { Button, Table, Tooltip, Typography } from 'antd';
import { ColumnsType, ColumnType } from 'antd/es/table';
import dayjs from 'dayjs';
import dompurify from 'dompurify';
import { useNotifications } from 'hooks/useNotifications';
// utils
import { FlatLogData } from 'lib/logs/flatLogData';
import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useCopyToClipboard } from 'react-use';
import { AppState } from 'store/reducers';
import { SET_CURRENT_LOG } from 'types/actions/logs';
import { IField } from 'types/api/logs/fields';
// interfaces
import { ILog } from 'types/api/logs/log';
import { GlobalReducer } from 'types/reducer/globalTime';
import ILogsReducer from 'types/reducer/logs';

// styles
import { ExpandIconWrapper } from '../RawLogView/styles';
// config
import { defaultCellStyle, defaultTableStyle, tableScroll } from './config';
import { AddButtonWrapper, TableBodyContent } from './styles';

type ColumnTypeRender<T = unknown> = ReturnType<
	NonNullable<ColumnType<T>['render']>
>;

type LogsTableViewProps = {
	logs: ILog[];
	fields: IField[];
	linesPerRow: number;
	onClickExpand: (log: ILog) => void;
};

const convert = new Convert();

function LogsTableView(props: LogsTableViewProps): JSX.Element {
	const { logs, fields, linesPerRow, onClickExpand } = props;
	const [value, copyToClipboard] = useCopyToClipboard();
	const dispatch = useDispatch();
	const { notifications } = useNotifications();

	useEffect(() => {
		if (value.value) {
			notifications.success({
				message: 'Copied to clipboard',
			});
		}
	}, [value, notifications]);
	const { minTime, maxTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const { searchFilter } = useSelector<AppState, ILogsReducer>(
		(state) => state.logs,
	);

	const flattenLogData = useMemo(() => logs.map((log) => FlatLogData(log)), [
		logs,
	]);

	const columns: ColumnsType<Record<string, unknown>> = useMemo(() => {
		const showContextHandler = (log: ILog): void => {
			dispatch({
				type: SET_CURRENT_LOG,
				payload: log,
			});
		};

		const copyLinkHandler = (log: ILog): void => {
			copyToClipboard(`
				${window.location.origin}/logs?q=${searchFilter.queryString}&startTime=${minTime}&endTime=${maxTime}&selectedLogId=${log.id}
			`);
		};

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
					const date = dayjs(field / 1e6).format();
					return {
						children: <Typography.Paragraph ellipsis>{date}</Typography.Paragraph>,
					};
				},
			},
			...fieldColumns,
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
			{
				title: 'action',
				dataIndex: 'action',
				key: 'action',
				render: (_, item): ColumnTypeRender<Record<string, unknown>> => ({
					props: {
						style: defaultTableStyle,
					},
					children: (
						<AddButtonWrapper>
							<Tooltip title="Show context">
								<Button
									onClick={(): void => showContextHandler((item as unknown) as ILog)}
								>
									<MonitorOutlined />
								</Button>
							</Tooltip>
							<Tooltip title="Copy link">
								<Button
									onClick={(): void => copyLinkHandler((item as unknown) as ILog)}
								>
									<LinkOutlined />
								</Button>
							</Tooltip>
						</AddButtonWrapper>
					),
				}),
			},
		];
	}, [
		fields,
		linesPerRow,
		onClickExpand,
		dispatch,
		maxTime,
		minTime,
		searchFilter,
		copyToClipboard,
	]);

	return (
		<Table
			size="small"
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
