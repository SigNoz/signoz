import { Typography } from 'antd';
import { ColumnsType } from 'antd/es/table';
import ROUTES from 'constants/routes';
import { getMs } from 'container/Trace/Filters/Panel/PanelBody/Duration/util';
import { DEFAULT_PER_PAGE_OPTIONS } from 'hooks/queryPagination';
import { generatePath, Link } from 'react-router-dom';
import { ListItem } from 'types/api/widgets/getQuery';

export const PER_PAGE_OPTIONS: number[] = [10, ...DEFAULT_PER_PAGE_OPTIONS];

export const columns: ColumnsType<ListItem['data']> = [
	{
		title: 'Root Service Name',
		dataIndex: 'subQuery.serviceName',
		key: 'serviceName',
	},
	{
		title: 'Root Operation Name',
		dataIndex: 'subQuery.name',
		key: 'name',
	},
	{
		title: 'Root Duration (in ms)',
		dataIndex: 'subQuery.durationNano',
		key: 'durationNano',
		render: (duration: number): JSX.Element => (
			<Typography>{getMs(String(duration))}ms</Typography>
		),
	},
	{
		title: 'No of Spans',
		dataIndex: 'span_count',
		key: 'span_count',
	},
	{
		title: 'TraceID',
		dataIndex: 'traceID',
		key: 'traceID',
		render: (traceID: string): JSX.Element => (
			<Link
				to={generatePath(ROUTES.TRACE_DETAIL, {
					id: traceID,
				})}
				data-testid="trace-id"
			>
				{traceID}
			</Link>
		),
	},
];
