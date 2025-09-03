import './spanLogs.styles.scss';

import cx from 'classnames';
import RawLogView from 'components/Logs/RawLogView';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import { QueryParams } from 'constants/query';
import {
	initialQueriesMap,
	OPERATORS,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import LogsError from 'container/LogsError/LogsError';
import { LogsLoading } from 'container/LogsLoading/LogsLoading';
import { FontSize } from 'container/OptionsMenu/types';
import { getOperatorValue } from 'container/QueryBuilder/filters/QueryBuilderSearch/utils';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import createQueryParams from 'lib/createQueryParams';
import { PreferenceContextProvider } from 'providers/preferences/context/PreferenceContextProvider';
import { MouseEvent, useCallback, useMemo } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { ILog } from 'types/api/logs/log';
import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import { v4 as uuid } from 'uuid';

import { useSpanContextLogs } from './useSpanContextLogs';

interface SpanLogsProps {
	traceId: string;
	spanId: string;
	timeRange: {
		startTime: number;
		endTime: number;
	};
}

function SpanLogs({ traceId, spanId, timeRange }: SpanLogsProps): JSX.Element {
	const { safeNavigate } = useSafeNavigate();
	const { updateAllQueriesOperators } = useQueryBuilder();

	const {
		logs,
		isLoading,
		isError,
		isFetching,
		isLogSpanRelated,
	} = useSpanContextLogs({
		traceId,
		spanId,
		timeRange,
	});

	// Create trace_id and span_id filters for span logs explorer navigation
	const createSpanLogsFilter = useCallback((): TagFilter => {
		const traceIdKey: BaseAutocompleteData = {
			id: uuid(),
			dataType: DataTypes.String,
			type: '',
			key: 'trace_id',
		};

		const spanIdKey: BaseAutocompleteData = {
			id: uuid(),
			dataType: DataTypes.String,
			type: '',
			key: 'span_id',
		};

		return {
			items: [
				{
					id: uuid(),
					op: getOperatorValue(OPERATORS['=']),
					value: traceId,
					key: traceIdKey,
				},
				{
					id: uuid(),
					op: getOperatorValue(OPERATORS['=']),
					value: spanId,
					key: spanIdKey,
				},
			],
			op: 'AND',
		};
	}, [traceId, spanId]);

	// Create trace_id only filters for context logs explorer navigation
	const createTraceOnlyFilter = useCallback((): TagFilter => {
		const traceIdKey: BaseAutocompleteData = {
			id: uuid(),
			dataType: DataTypes.String,
			type: '',
			key: 'trace_id',
		};

		return {
			items: [
				{
					id: uuid(),
					op: getOperatorValue(OPERATORS['=']),
					value: traceId,
					key: traceIdKey,
				},
			],
			op: 'AND',
		};
	}, [traceId]);

	// Navigate to logs explorer with appropriate filters based on log type
	const handleLogClick = useCallback(
		(log: ILog, event: MouseEvent): void => {
			// Determine if this is a span log or context log
			const isSpanLog = isLogSpanRelated(log.id);

			// Use appropriate filters: span logs get trace+span filters, context logs get trace-only filters
			const filters = isSpanLog ? createSpanLogsFilter() : createTraceOnlyFilter();

			// Create base query
			const baseQuery = updateAllQueriesOperators(
				initialQueriesMap[DataSource.LOGS],
				PANEL_TYPES.LIST,
				DataSource.LOGS,
			);

			// Add appropriate filters to the query
			const updatedQuery = {
				...baseQuery,
				builder: {
					...baseQuery.builder,
					queryData: baseQuery.builder.queryData.map((queryData) => ({
						...queryData,
						filters,
					})),
				},
			};

			const queryParams = {
				[QueryParams.activeLogId]: `"${log.id}"`,
				[QueryParams.startTime]: timeRange.startTime.toString(),
				[QueryParams.endTime]: timeRange.endTime.toString(),
				[QueryParams.compositeQuery]: JSON.stringify(updatedQuery),
			};

			const url = `${ROUTES.LOGS_EXPLORER}?${createQueryParams(queryParams)}`;

			// Check for Ctrl+click (Windows/Linux) or Cmd+click (Mac) to open in new tab
			const shouldOpenInNewTab = event.ctrlKey || event.metaKey;

			if (shouldOpenInNewTab) {
				window.open(url, '_blank');
			} else {
				safeNavigate(url);
			}
		},
		[
			isLogSpanRelated,
			createSpanLogsFilter,
			createTraceOnlyFilter,
			updateAllQueriesOperators,
			timeRange.startTime,
			timeRange.endTime,
			safeNavigate,
		],
	);

	// Footer rendering for pagination
	const hasReachedEndOfLogs = false; // Simplified for now

	const getItemContent = useCallback(
		(_: number, logToRender: ILog): JSX.Element => {
			const getIsSpanRelated = (log: ILog, currentSpanId: string): boolean => {
				if (log.spanID) {
					return log.spanID === currentSpanId;
				}
				return log.span_id === currentSpanId;
			};

			const isSpanRelated = getIsSpanRelated(logToRender, spanId);

			return (
				<RawLogView
					isTextOverflowEllipsisDisabled
					key={logToRender.id}
					data={logToRender}
					linesPerRow={5}
					fontSize={FontSize.MEDIUM}
					onLogClick={handleLogClick}
					isHighlighted={isSpanRelated}
					helpTooltip={
						isSpanRelated ? 'This log belongs to the current span' : undefined
					}
					selectedFields={[
						{
							dataType: 'string',
							type: '',
							name: 'body',
						},
						{
							dataType: 'string',
							type: '',
							name: 'timestamp',
						},
					]}
				/>
			);
		},
		[handleLogClick, spanId],
	);

	const renderFooter = useCallback((): JSX.Element | null => {
		if (isFetching) {
			return <div className="logs-loading-skeleton"> Loading more logs ... </div>;
		}

		if (hasReachedEndOfLogs) {
			return <div className="logs-loading-skeleton"> *** End *** </div>;
		}

		return null;
	}, [isFetching, hasReachedEndOfLogs]);

	const renderContent = useMemo(
		() => (
			<div className="span-logs-list-container">
				<PreferenceContextProvider>
					<OverlayScrollbar isVirtuoso>
						<Virtuoso
							className="span-logs-virtuoso"
							key="span-logs-virtuoso"
							data={logs}
							totalCount={logs.length}
							itemContent={getItemContent}
							style={{ height: `calc(${logs.length} * ${24}px + 40px)` }}
							overscan={200}
							components={{
								Footer: renderFooter,
							}}
						/>
					</OverlayScrollbar>
				</PreferenceContextProvider>
			</div>
		),
		[logs, getItemContent, renderFooter],
	);

	const renderNoLogsFound = (): JSX.Element => (
		<div className="span-logs-empty-content">
			<p>No logs found for this span</p>
		</div>
	);

	return (
		<div className={cx('span-logs', { 'span-logs-empty': logs.length === 0 })}>
			{(isLoading || isFetching) && <LogsLoading />}
			{!isLoading &&
				!isFetching &&
				!isError &&
				logs.length === 0 &&
				renderNoLogsFound()}
			{isError && !isLoading && !isFetching && <LogsError />}
			{!isLoading && !isFetching && !isError && logs.length > 0 && renderContent}
		</div>
	);
}

export default SpanLogs;
