import './LogsPanelComponent.styles.scss';

import LogDetail from 'components/LogDetail';
import { VIEW_TYPES } from 'components/LogDetail/constants';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import { ResizeTable } from 'components/ResizeTable';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { PANEL_TYPES } from 'constants/queryBuilder';
import Controls from 'container/Controls';
import { PER_PAGE_OPTIONS } from 'container/TracesExplorer/ListView/configs';
import { tableStyles } from 'container/TracesExplorer/ListView/styles';
import { useActiveLog } from 'hooks/logs/useActiveLog';
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
	useMemo,
	useState,
} from 'react';
import { UseQueryResult } from 'react-query';
import { SuccessResponse } from 'types/api';
import { Widgets } from 'types/api/dashboard/getAll';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

import { getLogPanelColumnsList } from './utils';

function LogsPanelComponent({
	widget,
	setRequestData,
	queryResponse,
}: LogsPanelComponentProps): JSX.Element {
	const [pageSize, setPageSize] = useState<number>(10);
	const [offset, setOffset] = useState<number>(0);

	const handleChangePageSize = (value: number): void => {
		setPageSize(value);
		setOffset(0);
		setRequestData((prev) => {
			const newQueryData = { ...prev.query };
			newQueryData.builder.queryData[0].pageSize = value;
			return {
				...prev,
				query: newQueryData,
				tableParams: {
					pagination: {
						limit: 0,
						offset: 0,
					},
				},
			};
		});
	};

	const { formatTimezoneAdjustedTimestamp } = useTimezone();

	const columns = useMemo(
		() =>
			getLogPanelColumnsList(
				widget.selectedLogFields,
				formatTimezoneAdjustedTimestamp,
			),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[widget.selectedLogFields],
	);

	const dataLength =
		queryResponse.data?.payload?.data?.newResult?.data?.result[0]?.list?.length;
	const totalCount = useMemo(() => dataLength || 0, [dataLength]);

	const { logs } = useLogsData({
		result: queryResponse.data?.payload?.data?.newResult?.data?.result,
		panelType: PANEL_TYPES.LIST,
		stagedQuery: widget.query,
	});

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

	const handleRequestData = (newOffset: number): void => {
		setOffset(newOffset);
		setRequestData((prev) => ({
			...prev,
			tableParams: {
				pagination: {
					limit: widget.query?.builder?.queryData[0]?.limit || 0,
					offset: newOffset < 0 ? 0 : newOffset,
				},
			},
		}));
	};

	const handlePreviousPagination = (): void => {
		const newOffset = offset - pageSize;
		handleRequestData(newOffset);
	};

	const handleNextPagination = (): void => {
		const newOffset = offset + pageSize;
		handleRequestData(newOffset);
	};

	if (queryResponse.isError) {
		return <div>{SOMETHING_WENT_WRONG}</div>;
	}

	return (
		<>
			<div className="logs-table">
				<div className="resize-table">
					<OverlayScrollbar>
						<ResizeTable
							pagination={false}
							tableLayout="fixed"
							scroll={{ x: `max-content` }}
							sticky
							loading={queryResponse.isFetching}
							style={tableStyles}
							dataSource={flattenLogData}
							columns={columns}
							onRow={handleRow}
							rowKey={(record): string => record.id}
							widgetId={widget.id}
							shouldPersistColumnWidths
						/>
					</OverlayScrollbar>
				</div>
				{!widget.query.builder.queryData[0].limit && (
					<div className="controller">
						<Controls
							totalCount={totalCount}
							perPageOptions={PER_PAGE_OPTIONS}
							isLoading={queryResponse.isFetching}
							offset={offset}
							countPerPage={pageSize}
							handleNavigatePrevious={handlePreviousPagination}
							handleNavigateNext={handleNextPagination}
							handleCountItemsPerPageChange={handleChangePageSize}
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
