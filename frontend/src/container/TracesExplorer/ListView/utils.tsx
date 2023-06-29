import { Tag } from 'antd';
import { ColumnsType } from 'antd/es/table';
import Typography from 'antd/es/typography/Typography';
import ROUTES from 'constants/routes';
import { getMs } from 'container/Trace/Filters/Panel/PanelBody/Duration/util';
import { formUrlParams } from 'container/TraceDetail/utils';
import dayjs from 'dayjs';
import { RowData } from 'lib/query/createTableColumnsFromQuery';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { QueryDataV3 } from 'types/api/widgets/getQuery';

export const transformDataWithDate = (data: QueryDataV3[]): QueryDataV3[] =>
	data.map((query) => ({
		...query,
		list:
			query?.list?.map((listItem) => ({
				...listItem,
				data: {
					...listItem?.data,
					date: listItem?.timestamp,
				},
			})) || null,
	}));

export const modifyColumns = (
	columns: ColumnsType<RowData>,
	selectedColumns: BaseAutocompleteData[],
): ColumnsType<RowData> => {
	const initialColumns = columns.filter(({ key }) => {
		let isValidColumn = true;

		const checkIsExistColumnByKey = (
			attributeKey: string,
			columnKey: string,
		): boolean =>
			!selectedColumns.find(({ key }) => key === attributeKey) &&
			key === columnKey;

		// TODO: remove spanID and traceID as second prop after updating API attributes
		const isSelectedSpanId = checkIsExistColumnByKey('spanId', 'spanID');
		const isSelectedTraceId = checkIsExistColumnByKey('traceId', 'traceID');

		if (isSelectedSpanId || isSelectedTraceId || key === 'date')
			isValidColumn = false;

		return isValidColumn;
	});

	const dateColumn = columns.find(({ key }) => key === 'date');

	if (dateColumn) {
		initialColumns.unshift(dateColumn);
	}

	return initialColumns.map((column) => {
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

		if (key === 'date') {
			return {
				...column,
				render: (date: string): JSX.Element => {
					const day = dayjs(date);
					return <Typography>{day.format('YYYY/MM/DD HH:mm:ss')}</Typography>;
				},
			};
		}

		return column;
	});
};

export const getTraceLink = (record: RowData): string =>
	`${ROUTES.TRACE}/${record.traceID}${formUrlParams({
		spanId: record.spanID,
		levelUp: 0,
		levelDown: 0,
	})}`;
