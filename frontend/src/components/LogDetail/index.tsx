/* eslint-disable sonarjs/cognitive-complexity */
import './LogDetails.styles.scss';

import { Color, Spacing } from '@signozhq/design-tokens';
import Convert from 'ansi-to-html';
import { Button, Divider, Drawer, Radio, Tooltip, Typography } from 'antd';
import { RadioChangeEvent } from 'antd/lib';
import cx from 'classnames';
import { LogType } from 'components/Logs/LogStateIndicator/LogStateIndicator';
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
	escapeHtml,
	removeEscapeCharacters,
	unescapeString,
} from 'container/LogDetailedView/utils';
import { useOptionsMenu } from 'container/OptionsMenu';
import dompurify from 'dompurify';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useNotifications } from 'hooks/useNotifications';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import createQueryParams from 'lib/createQueryParams';
import {
	BarChart2,
	Braces,
	Compass,
	Copy,
	Filter,
	Table,
	TextSelect,
	X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useCopyToClipboard, useLocation } from 'react-use';
import { AppState } from 'store/reducers';
import { Query, TagFilter } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource, StringOperators } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';
import { FORBID_DOM_PURIFY_TAGS } from 'utils/app';

import { RESOURCE_KEYS, VIEW_TYPES, VIEWS } from './constants';
import { LogDetailProps, LogDetailInnerProps } from './LogDetail.interfaces';
import QuerySearch from 'components/QueryBuilderV2/QueryV2/QuerySearch/QuerySearch';
import useInitialQuery from 'container/LogsExplorerContext/useInitialQuery';
import { cloneDeep } from 'lodash-es';
import { convertExpressionToFilters } from 'components/QueryBuilderV2/utils';

const convert = new Convert();

function LogDetailInner({
	log,
	onClose,
	onAddToQuery,
	onGroupByAttribute,
	onClickActionItem,
	selectedTab,
	isListViewPanel = false,
	listViewPanelSelectedFields,
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

	const listQuery = useMemo(() => {
		if (!stagedQuery || stagedQuery.builder.queryData.length < 1) return null;

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
			__html: convert.toHtml(
				dompurify.sanitize(unescapeString(escapeHtml(log?.body || '')), {
					FORBID_TAGS: [...FORBID_DOM_PURIFY_TAGS],
				}),
			),
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
				queryData: updatedContextQuery?.builder.queryData.map((queryData) => {
					return {
						...queryData,
						filter: {
							...queryData.filter,
							expression: expression,
						},
						filters: {
							...queryData.filters,
							...newFilters,
							op: queryData.filters?.op ?? 'AND',
						},
					};
				}),
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

	return (
		<Drawer
			width="60%"
			maskStyle={{ background: 'none' }}
			title={
				<div className="log-detail-drawer__title">
					<div className="log-detail-drawer__title-left">
						<Divider type="vertical" className={cx('log-type-indicator', LogType)} />
						<Typography.Text className="title">Log details</Typography.Text>
					</div>
					{showOpenInExplorerBtn && (
						<div className="log-detail-drawer__title-right">
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
			}
			placement="right"
			// closable
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
						className={selectedView === VIEW_TYPES.JSON ? 'selected_view tab' : 'tab'}
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

				{selectedView === VIEW_TYPES.JSON && (
					<div className="json-action-btn">
						<Button
							className="action-btn"
							icon={<Copy size={16} />}
							onClick={handleJSONCopy}
						/>
					</div>
				)}

				{selectedView === VIEW_TYPES.CONTEXT && (
					<Button
						className="action-btn"
						icon={<Filter size={16} />}
						onClick={handleFilterVisible}
					/>
				)}
			</div>
			{isFilterVisible && contextQuery?.builder.queryData[0] && (
				<div className="log-detail-drawer-query-container">
					<QuerySearch
						onChange={() => {}}
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
					onGroupByAttribute={onGroupByAttribute}
					isListViewPanel={isListViewPanel}
					selectedOptions={options}
					listViewPanelSelectedFields={listViewPanelSelectedFields}
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
					logLineTimestamp={log.timestamp.toString()}
				/>
			)}
		</Drawer>
	);
}

function LogDetail(props: LogDetailProps): JSX.Element {
	if (!props.log) {
		// eslint-disable-next-line react/jsx-no-useless-fragment
		return <></>;
	}

	return <LogDetailInner {...(props as LogDetailInnerProps)} />;
}

export default LogDetail;
