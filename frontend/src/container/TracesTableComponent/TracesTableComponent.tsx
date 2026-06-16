import {
	Dispatch,
	HTMLAttributes,
	SetStateAction,
	useCallback,
	useEffect,
	useMemo,
} from 'react';
import { UseQueryResult } from 'react-query';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import { ResizeTable } from 'components/ResizeTable';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { QueryParams } from 'constants/query';
import Controls from 'container/Controls';
import { PER_PAGE_OPTIONS } from 'container/TracesExplorer/ListView/configs';
import { tableStyles } from 'container/TracesExplorer/ListView/styles';
import {
	getListColumns,
	getTraceLink,
	transformDataWithDate,
} from 'container/TracesExplorer/ListView/utils';
import { Pagination } from 'hooks/queryPagination';
import useUrlQueryData from 'hooks/useUrlQueryData';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import history from 'lib/history';
import { RowData } from 'lib/query/createTableColumnsFromQuery';
import { useTimezone } from 'providers/Timezone';
import { SuccessResponse } from 'types/api';
import { Widgets } from 'types/api/dashboard/getAll';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { openInNewTab } from 'utils/navigation';

import './TracesTableComponent.styles.scss';

// Pagination is persisted in the URL (keyed per widget so multiple list panels
// on the same dashboard don't collide) rather than in component-local state,
// which would be lost when the panel briefly unmounts during a refetch.
const DEFAULT_PAGINATION_CONFIG: Pagination = { offset: 0, limit: 10 };

function TracesTableComponent({
	widget,
	queryResponse,
	setRequestData,
	onColumnWidthsChange,
}: TracesTableComponentProps): JSX.Element {
	const { queryData: paginationQueryData, redirectWithQuery } = useUrlQueryData<
		Pagination
	>(`${QueryParams.pagination}-${widget.id}`);
	const pagination = paginationQueryData ?? DEFAULT_PAGINATION_CONFIG;

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

	const columns = useMemo(
		() =>
			getListColumns(
				widget.selectedTracesFields || [],
				formatTimezoneAdjustedTimestamp,
			),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[widget.selectedTracesFields],
	);

	const dataLength =
		queryResponse.data?.payload?.data?.newResult?.data?.result[0]?.list?.length;
	const totalCount = useMemo(() => dataLength || 0, [dataLength]);

	const queryTableDataResult =
		queryResponse.data?.payload?.data?.newResult?.data?.result;
	const queryTableData = useMemo(
		() => queryTableDataResult || [],
		[queryTableDataResult],
	);

	const transformedQueryTableData = useMemo(
		() => (transformDataWithDate(queryTableData) || []) as unknown as RowData[],
		[queryTableData],
	);

	const handleRow = useCallback(
		(record: RowData): HTMLAttributes<RowData> => ({
			onClick: (event): void => {
				event.preventDefault();
				event.stopPropagation();
				if (event.metaKey || event.ctrlKey) {
					openInNewTab(getTraceLink(record));
				} else {
					history.push(getTraceLink(record));
				}
			},
		}),
		[],
	);

	const handlePaginationChange = useCallback(
		(newPagination: Pagination) => {
			redirectWithQuery(newPagination);
		},
		[redirectWithQuery],
	);

	if (queryResponse.isError) {
		return <div>{SOMETHING_WENT_WRONG}</div>;
	}

	return (
		<div className="traces-table">
			<div className="resize-table">
				<OverlayScrollbar>
					<ResizeTable
						pagination={false}
						tableLayout="fixed"
						scroll={{ x: 'max-content' }}
						loading={queryResponse.isFetching}
						style={tableStyles}
						dataSource={transformedQueryTableData}
						columns={columns}
						onRow={handleRow}
						sticky
						columnWidths={widget.columnWidths}
						onColumnWidthsChange={onColumnWidthsChange}
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
	onColumnWidthsChange?: (widths: Record<string, number>) => void;
};

export default TracesTableComponent;
