import { Tag } from 'antd';
import { ColumnsType } from 'antd/es/table';
import Typography from 'antd/es/typography/Typography';
import ROUTES from 'constants/routes';
import { getMs } from 'container/Trace/Filters/Panel/PanelBody/Duration/util';
import { formUrlParams } from 'container/TraceDetail/utils';
import dayjs from 'dayjs';
import { RowData } from 'lib/query/createTableColumnsFromQuery';
import { ILog } from 'types/api/logs/log';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { QueryDataV3 } from 'types/api/widgets/getQuery';

import { DateText } from './styles';

export const transformDataWithDate = (
	data: QueryDataV3[],
): Omit<ILog, 'timestamp'>[] =>
	data[0]?.list?.map(({ data, timestamp }) => ({ ...data, date: timestamp })) ||
	[];

export const getTraceLink = (record: RowData): string =>
	`${ROUTES.TRACE}/${record.traceID}${formUrlParams({
		spanId: record.spanID,
		levelUp: 0,
		levelDown: 0,
	})}`;

export const getListColumns = (
	selectedColumns: BaseAutocompleteData[],
): ColumnsType<RowData> => {
	const initialColumns: ColumnsType<RowData> = [
		{
			title: 'date',
			dataIndex: 'date',
			key: 'date',
			width: 145,
			render: (date: string): JSX.Element => {
				const day = dayjs(date);
				return <DateText>{day.format('YYYY/MM/DD HH:mm:ss')}</DateText>;
			},
		},
	];

	const columns: ColumnsType<RowData> =
		selectedColumns.map(({ dataType, key, type }) => ({
			title: key,
			dataIndex: key,
			key: `${key}-${dataType}-${type}`,
			render: (value): JSX.Element => {
				if (value === '') {
					return <Typography>N/A</Typography>;
				}

				if (key === 'httpMethod' || key === 'responseStatusCode') {
					return <Tag color="magenta">{value}</Tag>;
				}

				if (key === 'durationNano') {
					return <Typography>{getMs(value)}ms</Typography>;
				}

				return <Typography>{value}</Typography>;
			},
		})) || [];

	return [...initialColumns, ...columns];
};
