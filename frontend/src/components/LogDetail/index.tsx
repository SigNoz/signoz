/* eslint-disable sonarjs/cognitive-complexity */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useCopyToClipboard, useLocation } from 'react-use';
import { Color, Spacing } from '@signozhq/design-tokens';
import { Button, Divider, Drawer, Radio, Tooltip, Typography } from 'antd';
import { RadioChangeEvent } from 'antd/lib';
import cx from 'classnames';
import { LogType } from 'components/Logs/LogStateIndicator/LogStateIndicator';
import QuerySearch from 'components/QueryBuilderV2/QueryV2/QuerySearch/QuerySearch';
import { convertExpressionToFilters } from 'components/QueryBuilderV2/utils';
import { LOCALSTORAGE } from 'constants/localStorage';
import { QueryParams } from 'constants/query';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import ContextView from 'container/LogDetailedView/ContextView/ContextView';
import InfraMetrics from 'container/LogDetailedView/InfraMetrics/InfraMetrics';
import JSONView from 'container/LogDetailedView/JsonView';
import Overview from 'container/LogDetailedView/Overview';
import {
	aggregateAttributesResourcesToString,
	getSanitizedLogBody,
	removeEscapeCharacters,
} from 'container/LogDetailedView/utils';
import useInitialQuery from 'container/LogsExplorerContext/useInitialQuery';
import { useOptionsMenu } from 'container/OptionsMenu';
import { useCopyLogLink } from 'hooks/logs/useCopyLogLink';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useNotifications } from 'hooks/useNotifications';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import createQueryParams from 'lib/createQueryParams';
import { cloneDeep } from 'lodash-es';
import {
	ArrowDown,
	ArrowUp,
	BarChart2,
	Braces,
	ChevronDown,
	ChevronUp,
	Compass,
	Copy,
	Filter,
	Table,
	TextSelect,
	X,
} from 'lucide-react';
import { AppState } from 'store/reducers';
import { Query, TagFilter } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource, StringOperators } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';

import { RESOURCE_KEYS, VIEW_TYPES, VIEWS } from './constants';
import { LogDetailInnerProps, LogDetailProps } from './LogDetail.interfaces';

import './LogDetails.styles.scss';

function LogDetailInner({
	log,
	onClose,
	onAddToQuery,
	onClickActionItem,
	selectedTab,
	isListViewPanel = false,
	listViewPanelSelectedFields,
	handleChangeSelectedView,
	logs,
	onNavigateLog,
	onScrollToLog,
}: LogDetailInnerProps): JSX.Element {
	const initialContextQuery = useInitialQuery(log);
	const [contextQuery, setContextQuery] = useState<Query | undefined>(
		initialContextQuery,
	);
	const [, copyToClipboard] = useCopyToClipboard();
	const [selectedView, setSelectedView] = useState<VIEWS>(selectedTab);

	const [isFilterVisible, setIsFilterVisible] = useState<boolean>(false);

	const [filters, setFilters] = useState<TagFilter | null>(null);
	const [isEdit, setIsEdit] = useState<boolean>(false);
	const { stagedQuery, updateAllQueriesOperators } = useQueryBuilder();

	// Handle clicks outside to close drawer, except on explicitly ignored regions
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent): void => {
			const target = e.target as HTMLElement;

			// Don't close if clicking on explicitly ignored regions
			if (target.closest('[data-log-detail-ignore="true"]')) {
				return;
			}

			// Close the drawer for any other outside click
			onClose?.(e as any);
		};

		document.addEventListener('mousedown', handleClickOutside);

		return (): void => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [onClose]);

	// Keyboard navigation - handle up/down arrow keys
	// Only listen when in OVERVIEW tab
	useEffect(() => {
		if (
			!logs ||
			!onNavigateLog ||
			logs.length === 0 ||
			selectedView !== VIEW_TYPES.OVERVIEW
		) {
			return;
		}

		const handleKeyDown = (e: KeyboardEvent): void => {
			const currentIndex = logs.findIndex((l) => l.id === log.id);
			if (currentIndex === -1) {
				return;
			}

			if (e.key === 'ArrowUp') {
				e.preventDefault();
				e.stopPropagation();
				// Navigate to previous log
				if (currentIndex > 0) {
					const prevLog = logs[currentIndex - 1];
					onNavigateLog(prevLog);
					// Trigger scroll to the log element
					if (onScrollToLog) {
						onScrollToLog(prevLog.id);
					}
				}
			} else if (e.key === 'ArrowDown') {
				e.preventDefault();
				e.stopPropagation();
				// Navigate to next log
				if (currentIndex < logs.length - 1) {
					const nextLog = logs[currentIndex + 1];
					onNavigateLog(nextLog);
					// Trigger scroll to the log element
					if (onScrollToLog) {
						onScrollToLog(nextLog.id);
					}
				}
			}
		};

		document.addEventListener('keydown', handleKeyDown);
		return (): void => {
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [log.id, logs, onNavigateLog, onScrollToLog, selectedView]);

	const listQuery = useMemo(() => {
		if (!stagedQuery || stagedQuery.builder.queryData.length < 1) {
			return null;
		}

		return stagedQuery.builder.queryData.find((item) => !item.disabled) || null;
	}, [stagedQuery]);

	const { options } = useOptionsMenu({
		storageKey: LOCALSTORAGE.LOGS_LIST_OPTIONS,
		dataSource: DataSource.LOGS,
		aggregateOperator: listQuery?.aggregateOperator || StringOperators.NOOP,
	});

	const isDarkMode = useIsDarkMode();
	const location = useLocation();
	const { safeNavigate } = useSafeNavigate();
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const { notifications } = useNotifications();

	const { onLogCopy } = useCopyLogLink(log?.id);

	const LogJsonData = log ? aggregateAttributesResourcesToString(log) : '';

	const handleModeChange = (e: RadioChangeEvent): void => {
		setSelectedView(e.target.value);
		setIsEdit(false);
		setIsFilterVisible(false);
	};

	const handleFilterVisible = (): void => {
		setIsFilterVisible(!isFilterVisible);
		setIsEdit(!isEdit);
	};

	const drawerCloseHandler = (
		e: React.MouseEvent | React.KeyboardEvent,
	): void => {
		if (onClose) {
			onClose(e);
		}
	};

	const htmlBody = useMemo(
		() => ({
			__html: getSanitizedLogBody(log?.body || '', { shouldEscapeHtml: true }),
		}),
		[log?.body],
	);

	const handleJSONCopy = (): void => {
		copyToClipboard(LogJsonData);
		notifications.success({
			message: 'Copied to clipboard',
		});
	};

	// Go to logs explorer page with the log data
	const handleOpenInExplorer = (): void => {
		const queryParams = {
			[QueryParams.activeLogId]: `"${log?.id}"`,
			[QueryParams.startTime]: minTime?.toString() || '',
			[QueryParams.endTime]: maxTime?.toString() || '',
			[QueryParams.compositeQuery]: JSON.stringify(
				updateAllQueriesOperators(
					initialQueriesMap[DataSource.LOGS],
					PANEL_TYPES.LIST,
					DataSource.LOGS,
				),
			),
		};
		safeNavigate(`${ROUTES.LOGS_EXPLORER}?${createQueryParams(queryParams)}`);
	};

	const handleQueryExpressionChange = useCallback(
		(value: string, queryIndex: number) => {
			// update the query at the given index
			setContextQuery((prev) => {
				if (!prev) {
					return prev;
				}

				return {
					...prev,
					builder: {
						...prev.builder,
						queryData: prev.builder.queryData.map((query, idx) =>
							idx === queryIndex
								? {
										...query,
										filter: {
											...query.filter,
											expression: value,
										},
								  }
								: query,
						),
					},
				};
			});
		},
		[],
	);

	const handleRunQuery = (expression: string): void => {
		let updatedContextQuery = cloneDeep(contextQuery);

		if (!updatedContextQuery || !updatedContextQuery.builder) {
			return;
		}

		const newFilters: TagFilter = {
			items: expression ? convertExpressionToFilters(expression) : [],
			op: 'AND',
		};

		updatedContextQuery = {
			...updatedContextQuery,
			builder: {
				...updatedContextQuery?.builder,
				queryData: updatedContextQuery?.builder.queryData.map((queryData) => ({
					...queryData,
					filter: {
						...queryData.filter,
						expression,
					},
					filters: {
						...queryData.filters,
						...newFilters,
						op: queryData.filters?.op ?? 'AND',
					},
				})),
			},
		};

		setContextQuery(updatedContextQuery);

		if (newFilters) {
			setFilters(newFilters);
		}
	};

	// Only show when opened from infra monitoring page
	const showOpenInExplorerBtn = useMemo(
		() => location.pathname?.includes('/infrastructure-monitoring'),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	);

	const logType = log?.attributes_string?.log_level || LogType.INFO;
	const currentLogIndex = logs ? logs.findIndex((l) => l.id === log.id) : -1;
	const isPrevDisabled =
		!logs || !onNavigateLog || logs.length === 0 || currentLogIndex <= 0;
	const isNextDisabled =
		!logs ||
		!onNavigateLog ||
		logs.length === 0 ||
		currentLogIndex === logs.length - 1;

	type HandleNavigateLogParams = {
		direction: 'next' | 'previous';
	};

	const handleNavigateLog = ({ direction }: HandleNavigateLogParams): void => {
		if (!logs || !onNavigateLog || currentLogIndex === -1) {
			return;
		}
		if (direction === 'previous' && !isPrevDisabled) {
			const prevLog = logs[currentLogIndex - 1];
			onNavigateLog(prevLog);
			onScrollToLog?.(prevLog.id);
		} else if (direction === 'next' && !isNextDisabled) {
			const nextLog = logs[currentLogIndex + 1];
			onNavigateLog(nextLog);
			onScrollToLog?.(nextLog.id);
		}
	};

	return (
		<Drawer
			width="60%"
			mask={false}
			maskClosable={false}
			title={
				<div className="log-detail-drawer__title" data-log-detail-ignore="true">
					<div className="log-detail-drawer__title-left">
						<Divider type="vertical" className={cx('log-type-indicator', LogType)} />
						<Typography.Text className="title">Log details</Typography.Text>
					</div>
					<div className="log-detail-drawer__title-right">
						<div className="log-arrows">
							<Tooltip
								title={isPrevDisabled ? '' : 'Move to previous log'}
								placement="top"
								mouseLeaveDelay={0}
							>
								<Button
									icon={<ChevronUp size={14} />}
									className="log-arrow-btn log-arrow-btn-up"
									disabled={isPrevDisabled}
									onClick={(): void => handleNavigateLog({ direction: 'previous' })}
								/>
							</Tooltip>
							<Tooltip
								title={isNextDisabled ? '' : 'Move to next log'}
								placement="top"
								mouseLeaveDelay={0}
							>
								<Button
									icon={<ChevronDown size={14} />}
									className="log-arrow-btn log-arrow-btn-down"
									disabled={isNextDisabled}
									onClick={(): void => handleNavigateLog({ direction: 'next' })}
								/>
							</Tooltip>
						</div>
						{showOpenInExplorerBtn && (
							<div>
								<Button
									className="open-in-explorer-btn"
									icon={<Compass size={16} />}
									onClick={handleOpenInExplorer}
								>
									Open in Explorer
								</Button>
							</div>
						)}
					</div>
				</div>
			}
			placement="right"
			onClose={drawerCloseHandler}
			open={log !== null}
			style={{
				overscrollBehavior: 'contain',
				background: isDarkMode ? Color.BG_INK_400 : Color.BG_VANILLA_100,
			}}
			className="log-detail-drawer"
			destroyOnClose
			closeIcon={<X size={16} style={{ marginTop: Spacing.MARGIN_1 }} />}
		>
			<div className="log-detail-drawer__content" data-log-detail-ignore="true">
				<div className="log-detail-drawer__log">
					<Divider type="vertical" className={cx('log-type-indicator', logType)} />
					<Tooltip title={removeEscapeCharacters(log?.body)} placement="left">
						<div className="log-body" dangerouslySetInnerHTML={htmlBody} />
					</Tooltip>

					<div className="log-overflow-shadow">&nbsp;</div>
				</div>

				<div className="tabs-and-search">
					<Radio.Group
						className="views-tabs"
						onChange={handleModeChange}
						value={selectedView}
					>
						<Radio.Button
							className={
								// eslint-disable-next-line sonarjs/no-duplicate-string
								selectedView === VIEW_TYPES.OVERVIEW ? 'selected_view tab' : 'tab'
							}
							value={VIEW_TYPES.OVERVIEW}
						>
							<div className="view-title">
								<Table size={14} />
								Overview
							</div>
						</Radio.Button>
						<Radio.Button
							className={
								selectedView === VIEW_TYPES.JSON ? 'selected_view tab' : 'tab'
							}
							value={VIEW_TYPES.JSON}
						>
							<div className="view-title">
								<Braces size={14} />
								JSON
							</div>
						</Radio.Button>
						<Radio.Button
							className={
								selectedView === VIEW_TYPES.CONTEXT ? 'selected_view tab' : 'tab'
							}
							value={VIEW_TYPES.CONTEXT}
						>
							<div className="view-title">
								<TextSelect size={14} />
								Context
							</div>
						</Radio.Button>
						<Radio.Button
							className={
								selectedView === VIEW_TYPES.INFRAMETRICS ? 'selected_view tab' : 'tab'
							}
							value={VIEW_TYPES.INFRAMETRICS}
						>
							<div className="view-title">
								<BarChart2 size={14} />
								Metrics
							</div>
						</Radio.Button>
					</Radio.Group>

					<div className="log-detail-drawer__actions">
						{selectedView === VIEW_TYPES.CONTEXT && (
							<Tooltip
								title="Show Filters"
								placement="topLeft"
								aria-label="Show Filters"
							>
								<Button
									className="action-btn"
									icon={<Filter size={16} />}
									onClick={handleFilterVisible}
								/>
							</Tooltip>
						)}

						<Tooltip
							title={selectedView === VIEW_TYPES.JSON ? 'Copy JSON' : 'Copy Log Link'}
							placement="topLeft"
							aria-label={
								selectedView === VIEW_TYPES.JSON ? 'Copy JSON' : 'Copy Log Link'
							}
						>
							<Button
								className="action-btn"
								icon={<Copy size={16} />}
								onClick={selectedView === VIEW_TYPES.JSON ? handleJSONCopy : onLogCopy}
							/>
						</Tooltip>
					</div>
				</div>
				{isFilterVisible && contextQuery?.builder.queryData[0] && (
					<div className="log-detail-drawer-query-container">
						<QuerySearch
							onChange={(value): void => handleQueryExpressionChange(value, 0)}
							dataSource={DataSource.LOGS}
							queryData={contextQuery?.builder.queryData[0]}
							onRun={handleRunQuery}
						/>
					</div>
				)}

				{selectedView === VIEW_TYPES.OVERVIEW && (
					<Overview
						logData={log}
						onAddToQuery={onAddToQuery}
						onClickActionItem={onClickActionItem}
						isListViewPanel={isListViewPanel}
						selectedOptions={options}
						listViewPanelSelectedFields={listViewPanelSelectedFields}
						handleChangeSelectedView={handleChangeSelectedView}
					/>
				)}
				{selectedView === VIEW_TYPES.JSON && <JSONView logData={log} />}

				{selectedView === VIEW_TYPES.CONTEXT && (
					<ContextView
						log={log}
						filters={filters}
						contextQuery={contextQuery}
						isEdit={isEdit}
					/>
				)}
				{selectedView === VIEW_TYPES.INFRAMETRICS && (
					<InfraMetrics
						clusterName={log.resources_string?.[RESOURCE_KEYS.CLUSTER_NAME] || ''}
						podName={log.resources_string?.[RESOURCE_KEYS.POD_NAME] || ''}
						nodeName={log.resources_string?.[RESOURCE_KEYS.NODE_NAME] || ''}
						hostName={log.resources_string?.[RESOURCE_KEYS.HOST_NAME] || ''}
						timestamp={log.timestamp.toString()}
						dataSource={DataSource.LOGS}
					/>
				)}

				{selectedView === VIEW_TYPES.OVERVIEW && (
					<div className="log-detail-drawer__footer-hint">
						<div className="log-detail-drawer__footer-hint-content">
							<Typography.Text
								type="secondary"
								className="log-detail-drawer__footer-hint-text"
							>
								Use
							</Typography.Text>
							<ArrowUp size={14} className="log-detail-drawer__footer-hint-icon" />
							<span>/</span>
							<ArrowDown size={14} className="log-detail-drawer__footer-hint-icon" />
							<Typography.Text
								type="secondary"
								className="log-detail-drawer__footer-hint-text"
							>
								to view previous/next log
							</Typography.Text>
						</div>
					</div>
				)}
			</div>
		</Drawer>
	);
}

function LogDetail(props: LogDetailProps): JSX.Element {
	const { log } = props;
	if (!log) {
		// eslint-disable-next-line react/jsx-no-useless-fragment
		return <></>;
	}

	// eslint-disable-next-line react/jsx-props-no-spreading
	return <LogDetailInner {...(props as LogDetailInnerProps)} />;
}

export default LogDetail;
