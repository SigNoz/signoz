import './TracesTableComponent.styles.scss';

import { Table } from 'antd';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import Controls from 'container/Controls';
import { PER_PAGE_OPTIONS } from 'container/TracesExplorer/ListView/configs';
import { tableStyles } from 'container/TracesExplorer/ListView/styles';
import {
	getListColumns,
	getTraceLink,
	transformDataWithDate,
} from 'container/TracesExplorer/ListView/utils';
import { Pagination } from 'hooks/queryPagination';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import history from 'lib/history';
import { RowData } from 'lib/query/createTableColumnsFromQuery';
import { useTimezone } from 'providers/Timezone';
import {
	Dispatch,
	HTMLAttributes,
	SetStateAction,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from 'react';
import { UseQueryResult } from 'react-query';
import { SuccessResponse } from 'types/api';
import { Widgets } from 'types/api/dashboard/getAll';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

function TracesTableComponent({
	widget,
	queryResponse,
	setRequestData,
}: TracesTableComponentProps): JSX.Element {
	const [pagination, setPagination] = useState<Pagination>({
		offset: 0,
		limit: 10,
	});
	const { safeNavigate } = useSafeNavigate();

	useEffect(() => {
		setRequestData((prev) => ({
			...prev,
			tableParams: {
				...prev.tableParams,
				pagination,
			},
		}));
	}, [pagination, setRequestData]);

	const { formatTimezoneAdjustedTimestamp } = useTimezone();

	const columns = getListColumns(
		widget.selectedTracesFields || [],
		formatTimezoneAdjustedTimestamp,
	);

	const dataLength =
		queryResponse.data?.payload?.data?.newResult?.data?.result[0]?.list?.length;
	const totalCount = useMemo(() => dataLength || 0, [dataLength]);

	const queryTableDataResult =
		queryResponse.data?.payload?.data?.newResult?.data?.result;
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

	const handlePaginationChange = useCallback(
		(newPagination: Pagination) => {
			const urlQuery = new URLSearchParams(window.location.search);

			// Update URL with new pagination values
			urlQuery.set('offset', newPagination.offset.toString());
			urlQuery.set('limit', newPagination.limit.toString());

			// Update URL without page reload
			safeNavigate({
				search: urlQuery.toString(),
			});

			// Update component state
			setPagination(newPagination);
		},
		[safeNavigate],
	);

	if (queryResponse.isError) {
		return <div>{SOMETHING_WENT_WRONG}</div>;
	}

	return (
		<div className="traces-table">
			<div className="resize-table">
				<OverlayScrollbar>
					<Table
						pagination={false}
						tableLayout="fixed"
						scroll={{ x: true }}
						loading={queryResponse.isFetching}
						style={tableStyles}
						dataSource={transformedQueryTableData}
						columns={columns}
						onRow={handleRow}
						sticky
					/>
				</OverlayScrollbar>
			</div>
			<div className="controller">
				<Controls
					totalCount={totalCount}
					perPageOptions={PER_PAGE_OPTIONS}
					isLoading={queryResponse.isFetching}
					offset={pagination.offset}
					countPerPage={pagination.limit}
					handleNavigatePrevious={(): void => {
						handlePaginationChange({
							...pagination,
							offset: pagination.offset - pagination.limit,
						});
					}}
					handleNavigateNext={(): void => {
						handlePaginationChange({
							...pagination,
							offset: pagination.offset + pagination.limit,
						});
					}}
					handleCountItemsPerPageChange={(value): void => {
						handlePaginationChange({
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
	queryResponse: UseQueryResult<
		SuccessResponse<MetricRangePayloadProps, unknown>,
		Error
	>;
	widget: Widgets;
	setRequestData: Dispatch<SetStateAction<GetQueryResultsProps>>;
};

export default TracesTableComponent;
