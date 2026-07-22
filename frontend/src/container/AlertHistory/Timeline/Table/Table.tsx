import { HTMLAttributes, useCallback, useMemo } from 'react';
import { Button, Table } from 'antd';
import { ChevronLeft, ChevronRight } from '@signozhq/icons';
import logEvent from 'api/common/logEvent';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import ErrorContent from 'components/ErrorModal/components/ErrorContent';
import {
	QuerySearchV2Provider,
	useExpression,
	useInputExpression,
	useQuerySearchOnChange,
	useQuerySearchOnRun,
} from 'components/QueryBuilderV2';
import QuerySearch from 'components/QueryBuilderV2/QueryV2/QuerySearch/QuerySearch';
import { initialQueryBuilderFormValuesMap } from 'constants/queryBuilder';
import RunQueryBtn from 'container/QueryBuilder/components/RunQueryBtn/RunQueryBtn';
import {
	useGetAlertRuleDetailsTimelineTable,
	useTimelineTable,
} from 'pages/AlertDetails/hooks';
import { labelsArrayToObject } from 'container/AlertHistory/utils/labelAdapters';
import { useTimezone } from 'providers/Timezone';
import { AlertRuleTimelineTableResponse } from 'types/api/alerts/def';
import { DataSource } from 'types/common/queryBuilder';

import { useAlertHistoryFilterSuggestions } from './useAlertHistoryFilterSuggestions';
import { timelineTableColumns } from './useTimelineTable';

import './Table.styles.scss';

export const ALERT_HISTORY_EXPRESSION_KEY = 'alertHistoryExpression';

function TimelineTableContent(): JSX.Element {
	const expression = useExpression();
	const inputExpression = useInputExpression();
	const querySearchOnChange = useQuerySearchOnChange();
	const querySearchOnRun = useQuerySearchOnRun();

	const {
		isLoading,
		isRefetching,
		isError,
		data,
		error,
		ruleId,
		refetch,
		cancel,
	} = useGetAlertRuleDetailsTimelineTable({ filterExpression: expression });

	const apiError = useMemo(() => convertToApiError(error), [error]);

	const { hardcodedAttributeKeys, valueSuggestionsOverride, isLoadingKeys } =
		useAlertHistoryFilterSuggestions(ruleId ?? null);

	const { timelineData, totalItems, nextCursor } = useMemo(() => {
		const response = data?.data;
		const items: AlertRuleTimelineTableResponse[] | undefined =
			response?.items?.map((item) => {
				const itemWithLinks = item as typeof item & {
					relatedLogsLink?: string;
					relatedTracesLink?: string;
				};
				return {
					ruleID: item.ruleId,
					ruleName: item.ruleName,
					overallState: item.overallState as string,
					overallStateChanged: item.overallStateChanged,
					state: item.state as string,
					stateChanged: item.stateChanged,
					unixMilli: item.unixMilli,
					fingerprint: item.fingerprint,
					value: item.value,
					labels: labelsArrayToObject(item.labels),
					relatedLogsLink: itemWithLinks.relatedLogsLink,
					relatedTracesLink: itemWithLinks.relatedTracesLink,
				};
			});

		return {
			timelineData: items,
			totalItems: response?.total ?? 0,
			nextCursor: response?.nextCursor,
		};
	}, [data?.data]);

	const {
		paginationConfig,
		onChangeHandler,
		handleNextPage,
		handlePrevPage,
		hasNextPage,
		hasPrevPage,
	} = useTimelineTable({
		totalItems: totalItems ?? 0,
		nextCursor,
	});

	const { formatTimezoneAdjustedTimestamp } = useTimezone();

	const handleRunQuery = useCallback(
		(updatedExpression?: string): void => {
			const nextExpression = updatedExpression ?? inputExpression;
			querySearchOnRun(nextExpression);

			if (nextExpression === expression) {
				refetch();
			}
		},
		[querySearchOnRun, refetch, inputExpression, expression],
	);

	const queryData = useMemo(
		() => ({
			...initialQueryBuilderFormValuesMap.logs,
			queryName: 'A',
			dataSource: DataSource.LOGS,
			filter: { expression },
			expression,
		}),
		[expression],
	);

	const handleRowClick = (
		record: AlertRuleTimelineTableResponse,
	): HTMLAttributes<AlertRuleTimelineTableResponse> => ({
		onClick: (): void => {
			void logEvent('Alert history: Timeline table row: Clicked', {
				ruleId: record.ruleID,
				labels: record.labels,
			});
		},
	});

	return (
		<div className="timeline-table">
			{!isLoadingKeys || hardcodedAttributeKeys ? (
				<div className="timeline-table__filter">
					<div className="timeline-table__filter-row">
						<div className="timeline-table__filter-search">
							<QuerySearch
								onChange={querySearchOnChange}
								queryData={queryData}
								dataSource={DataSource.LOGS}
								onRun={handleRunQuery}
								hardcodedAttributeKeys={hardcodedAttributeKeys}
								valueSuggestionsOverride={valueSuggestionsOverride}
							/>
						</div>
						<RunQueryBtn
							isLoadingQueries={isLoading || isRefetching}
							onStageRunQuery={(): void => handleRunQuery()}
							handleCancelQuery={cancel}
						/>
					</div>
				</div>
			) : (
				<div className="timeline-table__filter timeline-table__filter--loading" />
			)}
			<Table
				rowKey={(row): string => `${row.fingerprint}-${row.value}-${row.unixMilli}`}
				columns={timelineTableColumns({
					formatTimezoneAdjustedTimestamp,
				})}
				onRow={handleRowClick}
				dataSource={timelineData}
				pagination={false}
				size="middle"
				onChange={onChangeHandler}
				loading={isLoading || isRefetching}
				locale={{
					emptyText:
						isError && apiError ? (
							<div className="timeline-table__error">
								<ErrorContent error={apiError} />
							</div>
						) : undefined,
				}}
				footer={(): JSX.Element => (
					<div className="timeline-table__pagination">
						<div className="timeline-table__pagination-info">
							{paginationConfig.showTotal?.(totalItems, [
								totalItems === 0
									? 0
									: ((paginationConfig.current ?? 1) - 1) *
											(paginationConfig.pageSize ?? 10) +
										1,
								Math.min(
									(paginationConfig.current ?? 1) * (paginationConfig.pageSize ?? 10),
									totalItems,
								),
							])}
						</div>
						<div className="pagination-controls">
							<Button
								type="text"
								size="small"
								disabled={!hasPrevPage}
								onClick={handlePrevPage}
								data-testid="timeline-prev-page"
							>
								<ChevronLeft size={14} />
							</Button>
							<Button
								type="text"
								size="small"
								disabled={!hasNextPage}
								onClick={handleNextPage}
								data-testid="timeline-next-page"
							>
								<ChevronRight size={14} />
							</Button>
						</div>
					</div>
				)}
			/>
		</div>
	);
}

function TimelineTable(): JSX.Element {
	return (
		<QuerySearchV2Provider
			queryParamKey={ALERT_HISTORY_EXPRESSION_KEY}
			initialExpression=""
			persistOnUnmount
		>
			<TimelineTableContent />
		</QuerySearchV2Provider>
	);
}

export default TimelineTable;
