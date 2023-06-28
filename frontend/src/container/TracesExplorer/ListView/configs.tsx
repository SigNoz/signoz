import { Tag } from 'antd';
import { ColumnsType } from 'antd/es/table';
import Typography from 'antd/es/typography/Typography';
import { getMs } from 'container/Trace/Filters/Panel/PanelBody/Duration/util';
import { DEFAULT_PER_PAGE_OPTIONS } from 'hooks/queryPagination';
import { RowData } from 'lib/query/createTableColumnsFromQuery';

export const selectedColumns: string[] = [
	'name',
	'serviceName',
	'responseStatusCode',
	'httpMethod',
	'durationNano',
];

export const PER_PAGE_OPTIONS: number[] = [10, ...DEFAULT_PER_PAGE_OPTIONS];

export const modifiedColumns = (
	columns: ColumnsType<RowData>,
): ColumnsType<RowData> =>
	columns.map((column) => {
		const key = column.key as string;

		const getHttpMethodOrStatus = (value: string): JSX.Element => {
			if (value === 'N/A') {
				return <Typography>{value}</Typography>;
			}

			return <Tag color="magenta">{value}</Tag>;
		};

		if (key === 'durationNano') {
			return {
				...column,
				render: (duration: string): JSX.Element => (
					<Typography>{getMs(duration)}ms</Typography>
				),
			};
		}

		if (key === 'httpMethod' || key === 'responseStatusCode') {
			return {
				...column,
				render: getHttpMethodOrStatus,
			};
		}

		return column;
	});
