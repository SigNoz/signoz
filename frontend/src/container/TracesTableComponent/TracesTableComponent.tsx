import './TracesTableComponent.styles.scss';

import { ResizeTable } from 'components/ResizeTable';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { tableStyles } from 'container/TracesExplorer/ListView/styles';
import {
	getListColumns,
	getTraceLink,
	transformDataWithDate,
} from 'container/TracesExplorer/ListView/utils';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { Pagination } from 'hooks/queryPagination';
import history from 'lib/history';
import { RowData } from 'lib/query/createTableColumnsFromQuery';
import { HTMLAttributes, useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { Widgets } from 'types/api/dashboard/getAll';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { GlobalReducer } from 'types/reducer/globalTime';

function TracesTableComponent({
	selectedTracesFields,
	query,
}: TracesTableComponentProps): JSX.Element {
	const { selectedTime: globalSelectedTime, maxTime, minTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const [paginationQueryData, setPaginationQueryData] = useState<Pagination>({
		offset: 0,
		limit: 10,
	});

	const { data, isFetching, isError } = useGetQueryRange(
		{
			query,
			graphType: PANEL_TYPES.LIST,
			selectedTime: 'GLOBAL_TIME',
			globalSelectedInterval: globalSelectedTime,
			params: {
				dataSource: 'traces',
			},
			tableParams: {
				pagination: paginationQueryData,
				selectColumns: selectedTracesFields,
			},
		},
		{
			queryKey: [
				REACT_QUERY_KEY.GET_QUERY_RANGE,
				globalSelectedTime,
				maxTime,
				minTime,
				query,
				paginationQueryData,
				selectedTracesFields,
			],
			enabled: !!query && !!selectedTracesFields?.length,
		},
	);

	const columns = getListColumns(selectedTracesFields || []);

	const dataLength =
		data?.payload?.data?.newResult?.data?.result[0]?.list?.length;
	const totalCount = useMemo(() => dataLength || 0, [dataLength]);

	const queryTableDataResult = data?.payload.data.newResult.data.result;
	const queryTableData = useMemo(() => queryTableDataResult || [], [
		queryTableDataResult,
	]);

	const transformedQueryTableData = useMemo(
		() => transformDataWithDate(queryTableData) || [],
		[queryTableData],
	);

	const handleRow = useCallback(
		(record: RowData): HTMLAttributes<RowData> => ({
			onClick: (event): void => {
				event.preventDefault();
				event.stopPropagation();
				if (event.metaKey || event.ctrlKey) {
					window.open(getTraceLink(record), '_blank');
				} else {
					history.push(getTraceLink(record));
				}
			},
		}),
		[],
	);

	return (
		<div>
			{!isError && (
				<div className="traces-table">
					<div className="resize-table">
						<ResizeTable
							pagination={false}
							tableLayout="fixed"
							scroll={{ x: true, y: 330 }}
							loading={isFetching}
							style={tableStyles}
							dataSource={transformedQueryTableData}
							columns={columns}
							onRow={handleRow}
						/>
					</div>
					<div className="controller">Controller</div>
				</div>
			)}
		</div>
	);
}

export type TracesTableComponentProps = {
	selectedTracesFields: Widgets['selectedTracesFields'];
	query: Query;
};

export default TracesTableComponent;
