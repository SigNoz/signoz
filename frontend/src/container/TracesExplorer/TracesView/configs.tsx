import { Typography } from 'antd';
import { ColumnsType } from 'antd/es/table';
import ROUTES from 'constants/routes';
import { getMs } from 'container/Trace/Filters/Panel/PanelBody/Duration/util';
import { DEFAULT_PER_PAGE_OPTIONS } from 'hooks/queryPagination';
import { RowData } from 'lib/query/createTableColumnsFromQuery';
import { toCapitalize } from 'lib/toCapitalize';
import { generatePath } from 'react-router-dom';

export const PER_PAGE_OPTIONS: number[] = [10, ...DEFAULT_PER_PAGE_OPTIONS];

export const modifiedColumns = (
	columns: ColumnsType<RowData>,
): ColumnsType<RowData> =>
	columns.map((column) => {
		const key = column.key as string;

		if (key === 'traceID') {
			return {
				...column,
				render: (traceID: string): JSX.Element => (
					<Typography.Link
						href={generatePath(ROUTES.TRACE_DETAIL, {
							id: traceID,
						})}
					>
						{traceID}
					</Typography.Link>
				),
			};
		}

		if (key.includes('subQuery')) {
			const renamedColumn = {
				...column,
				title: toCapitalize(key.split('.')[1]),
			};

			if (key.includes('durationNano')) {
				return {
					...renamedColumn,
					render: (duration: string): JSX.Element => (
						<Typography>{getMs(duration)}</Typography>
					),
				};
			}

			return renamedColumn;
		}

		return column;
	});
