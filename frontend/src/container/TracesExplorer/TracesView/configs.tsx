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
		dataIndex: 'service.name',
		key: 'serviceName',
	},
	{
		title: 'Root Operation Name',
		dataIndex: 'name',
		key: 'name',
	},
	{
		title: 'Root Duration (in ms)',
		dataIndex: 'duration_nano',
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
		dataIndex: 'trace_id',
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
