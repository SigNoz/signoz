import './TracesTableComponent.styles.scss';

import { Table } from 'antd';
// import { ResizeTable } from 'components/ResizeTable';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import Controls from 'container/Controls';
import { timePreferance } from 'container/NewWidget/RightContainer/timeItems';
import { PER_PAGE_OPTIONS } from 'container/TracesExplorer/ListView/configs';
import { tableStyles } from 'container/TracesExplorer/ListView/styles';
import {
	getListColumns,
	getTraceLink,
	transformDataWithDate,
} from 'container/TracesExplorer/ListView/utils';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { Pagination } from 'hooks/queryPagination';
import { getDashboardVariables } from 'lib/dashbaordVariables/getDashboardVariables';
import history from 'lib/history';
import { RowData } from 'lib/query/createTableColumnsFromQuery';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { HTMLAttributes, useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { Widgets } from 'types/api/dashboard/getAll';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { GlobalReducer } from 'types/reducer/globalTime';

function TracesTableComponent({
	selectedTracesFields,
	query,
	selectedTime,
}: TracesTableComponentProps): JSX.Element {
	const { selectedTime: globalSelectedTime, maxTime, minTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const [pagination, setPagination] = useState<Pagination>({
		offset: 0,
		limit: 10,
	});

	const { selectedDashboard } = useDashboard();

	const { data, isFetching, isError } = useGetQueryRange(
		{
			query,
			graphType: PANEL_TYPES.LIST,
			selectedTime: selectedTime?.enum || 'GLOBAL_TIME',
			globalSelectedInterval: globalSelectedTime,
			params: {
				dataSource: 'traces',
			},
			tableParams: {
				pagination,
				selectColumns: selectedTracesFields,
			},
			variables: getDashboardVariables(selectedDashboard?.data.variables),
		},
		{
			queryKey: [
				REACT_QUERY_KEY.GET_QUERY_RANGE,
				globalSelectedTime,
				maxTime,
				minTime,
				query,
				pagination,
				selectedTracesFields?.length,
				selectedTime?.enum,
				selectedDashboard?.data.variables,
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
		() => ((transformDataWithDate(queryTableData) || []) as unknown) as RowData[],
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

	if (isError) {
		return <div>{SOMETHING_WENT_WRONG}</div>;
	}

	return (
		<div className="traces-table">
			<div className="resize-table">
				<Table
					pagination={false}
					tableLayout="fixed"
					scroll={{ x: true }}
					loading={isFetching}
					style={tableStyles}
					dataSource={transformedQueryTableData}
					columns={columns}
					onRow={handleRow}
					sticky
				/>
			</div>
			<div className="controller">
				<Controls
					totalCount={totalCount}
					perPageOptions={PER_PAGE_OPTIONS}
					isLoading={isFetching}
					offset={pagination.offset}
					countPerPage={pagination.limit}
					handleNavigatePrevious={(): void => {
						setPagination({
							...pagination,
							offset: pagination.offset - pagination.limit,
						});
					}}
					handleNavigateNext={(): void => {
						setPagination({
							...pagination,
							offset: pagination.offset + pagination.limit,
						});
					}}
					handleCountItemsPerPageChange={(value): void => {
						setPagination({
							...pagination,
							limit: value,
							offset: 0,
						});
					}}
				/>
			</div>
		</div>
	);
}

export type TracesTableComponentProps = {
	selectedTracesFields: Widgets['selectedTracesFields'];
	query: Query;
	selectedTime?: timePreferance;
};

TracesTableComponent.defaultProps = {
	selectedTime: undefined,
};

export default TracesTableComponent;
