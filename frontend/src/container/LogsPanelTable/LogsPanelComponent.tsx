import './LogsPanelComponent.styles.scss';

import { Table } from 'antd';
import LogDetail from 'components/LogDetail';
import { VIEW_TYPES } from 'components/LogDetail/constants';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { PANEL_TYPES } from 'constants/queryBuilder';
import Controls from 'container/Controls';
import { PER_PAGE_OPTIONS } from 'container/TracesExplorer/ListView/configs';
import { tableStyles } from 'container/TracesExplorer/ListView/styles';
import { useActiveLog } from 'hooks/logs/useActiveLog';
import { Pagination } from 'hooks/queryPagination';
import { useLogsData } from 'hooks/useLogsData';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import { FlatLogData } from 'lib/logs/flatLogData';
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
import { ILog } from 'types/api/logs/log';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

import { getLogPanelColumnsList, getNextOrPreviousItems } from './utils';

function LogsPanelComponent({
	widget,
	setRequestData,
	queryResponse,
}: LogsPanelComponentProps): JSX.Element {
	const [pagination, setPagination] = useState<Pagination>({
		offset: 0,
		limit: widget.query.builder.queryData[0].limit || 0,
	});

	useEffect(() => {
		setRequestData((prev) => ({
			...prev,
			tableParams: {
				pagination,
			},
		}));
	}, [pagination, setRequestData]);

	const [pageSize, setPageSize] = useState<number>(10);

	const handleChangePageSize = (value: number): void => {
		setPagination({
			...pagination,
			limit: 0,
			offset: value,
		});
		setPageSize(value);
		setRequestData((prev) => {
			const newQueryData = { ...prev.query };
			newQueryData.builder.queryData[0].pageSize = value;
			return {
				...prev,
				query: newQueryData,
				tableParams: {
					pagination: {
						limit: 0,
						offset: value,
					},
				},
			};
		});
	};

	const { formatTimezoneAdjustedTimestamp } = useTimezone();

	const columns = getLogPanelColumnsList(
		widget.selectedLogFields,
		formatTimezoneAdjustedTimestamp,
	);

	const dataLength =
		queryResponse.data?.payload?.data?.newResult?.data?.result[0]?.list?.length;
	const totalCount = useMemo(() => dataLength || 0, [dataLength]);

	const [firstLog, setFirstLog] = useState<ILog>();
	const [lastLog, setLastLog] = useState<ILog>();

	const { logs } = useLogsData({
		result: queryResponse.data?.payload?.data?.newResult?.data?.result,
		panelType: PANEL_TYPES.LIST,
		stagedQuery: widget.query,
	});

	useEffect(() => {
		if (logs.length) {
			setFirstLog(logs[0]);
			setLastLog(logs[logs.length - 1]);
		}
	}, [logs]);

	const flattenLogData = useMemo(
		() => logs.map((log) => FlatLogData(log) as RowData),
		[logs],
	);

	const {
		activeLog,
		onSetActiveLog,
		onClearActiveLog,
		onAddToQuery,
		onGroupByAttribute,
	} = useActiveLog();

	const handleRow = useCallback(
		(record: RowData): HTMLAttributes<RowData> => ({
			onClick: (): void => {
				const log = logs.find((item) => item.id === record.id);
				if (log) onSetActiveLog(log);
			},
		}),
		[logs, onSetActiveLog],
	);

	const isOrderByTimeStamp =
		widget.query.builder.queryData[0].orderBy.length > 0 &&
		widget.query.builder.queryData[0].orderBy[0].columnName === 'timestamp';

	const handlePreviousPagination = (): void => {
		if (isOrderByTimeStamp) {
			setRequestData((prev) => ({
				...prev,
				query: {
					...prev.query,
					builder: {
						...prev.query.builder,
						queryData: [
							{
								...prev.query.builder.queryData[0],
								filters: {
									...prev.query.builder.queryData[0].filters,
									items: [
										...getNextOrPreviousItems(
											prev.query.builder.queryData[0].filters.items,
											'PREV',
											firstLog,
										),
									],
								},
								limit: 0,
								offset: 0,
							},
						],
					},
				},
			}));
		}
		if (!isOrderByTimeStamp) {
			setPagination({
				...pagination,
				limit: 0,
				offset: pagination.offset - pageSize,
			});
		}
	};

	const handleNextPagination = (): void => {
		if (isOrderByTimeStamp) {
			setRequestData((prev) => ({
				...prev,
				query: {
					...prev.query,
					builder: {
						...prev.query.builder,
						queryData: [
							{
								...prev.query.builder.queryData[0],
								filters: {
									...prev.query.builder.queryData[0].filters,
									items: [
										...getNextOrPreviousItems(
											prev.query.builder.queryData[0].filters.items,
											'NEXT',
											lastLog,
										),
									],
								},
								limit: 0,
								offset: 0,
							},
						],
					},
				},
			}));
		}
		if (!isOrderByTimeStamp) {
			setPagination({
				...pagination,
				limit: 0,
				offset: pagination.offset + pageSize,
			});
		}
	};

	if (queryResponse.isError) {
		return <div>{SOMETHING_WENT_WRONG}</div>;
	}

	return (
		<>
			<div className="logs-table">
				<div className="resize-table">
					<OverlayScrollbar>
						<Table
							pagination={false}
							tableLayout="fixed"
							scroll={{ x: `calc(50vw - 10px)` }}
							sticky
							loading={queryResponse.isFetching}
							style={tableStyles}
							dataSource={flattenLogData}
							columns={columns}
							onRow={handleRow}
						/>
					</OverlayScrollbar>
				</div>
				{!widget.query.builder.queryData[0].limit && (
					<div className="controller">
						<Controls
							totalCount={totalCount}
							perPageOptions={PER_PAGE_OPTIONS}
							isLoading={queryResponse.isFetching}
							offset={pagination.offset}
							countPerPage={pageSize}
							handleNavigatePrevious={handlePreviousPagination}
							handleNavigateNext={handleNextPagination}
							handleCountItemsPerPageChange={handleChangePageSize}
							isLogPanel={isOrderByTimeStamp}
						/>
					</div>
				)}
			</div>
			<LogDetail
				selectedTab={VIEW_TYPES.OVERVIEW}
				log={activeLog}
				onClose={onClearActiveLog}
				onAddToQuery={onAddToQuery}
				onClickActionItem={onAddToQuery}
				onGroupByAttribute={onGroupByAttribute}
				isListViewPanel
				listViewPanelSelectedFields={widget?.selectedLogFields}
			/>
		</>
	);
}

export type LogsPanelComponentProps = {
	setRequestData: Dispatch<SetStateAction<GetQueryResultsProps>>;
	queryResponse: UseQueryResult<
		SuccessResponse<MetricRangePayloadProps, unknown>,
		Error
	>;
	widget: Widgets;
};

export default LogsPanelComponent;
