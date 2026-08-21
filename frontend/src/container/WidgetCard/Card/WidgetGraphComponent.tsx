import { RefObject, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Skeleton, Tooltip } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import cx from 'classnames';
import { useNavigateToExplorer } from 'components/CeleryTask/useNavigateToExplorer';
import { ToggleGraphProps } from 'components/Graph/types';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { PanelMode } from 'lib/visualization/panels/types';
import PanelWrapper from 'container/WidgetCard/PanelWrapper/PanelWrapper';
import useGetResolvedText from 'hooks/dashboard/useGetResolvedText';
import { useNotifications } from 'hooks/useNotifications';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import createQueryParams from 'lib/createQueryParams';
import { RowData } from 'lib/query/createTableColumnsFromQuery';
import {
	getCustomTimeRangeWindowSweepInMS,
	getStartAndEndTimesInMilliseconds,
} from 'pages/MessagingQueues/MessagingQueuesUtils';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';

import { useGraphClickToShowButton } from 'container/WidgetCard/hooks/useGraphClickToShowButton';
import useNavigateToExplorerPages from 'container/WidgetCard/hooks/useNavigateToExplorerPages';
import WidgetHeader from 'container/WidgetCard/Header';
import FullView from 'container/WidgetCard/Card/FullView';
import { Modal } from 'container/WidgetCard/Card/styles';
import { WidgetGraphComponentProps } from 'container/WidgetCard/Card/types';
import {
	getLocalStorageGraphVisibilityState,
	handleGraphClick,
} from 'container/WidgetCard/Card/utils';

import 'container/WidgetCard/WidgetCard.styles.scss';

function WidgetGraphComponent({
	widget,
	queryResponse,
	version,
	threshold,
	headerMenuList,
	isWarning,
	isFetchingResponse,
	setRequestData,
	onClickHandler,
	onDragSelect,
	customOnDragSelect,
	customTooltipElement,
	openTracesButton,
	onOpenTraceBtnClick,
	customSeries,
	customErrorMessage,
	customOnRowClick,
	customTimeRangeWindowForCoRelation,
	enableDrillDown,
	hidePagination,
}: WidgetGraphComponentProps): JSX.Element {
	const { safeNavigate } = useSafeNavigate();
	const { notifications } = useNotifications();
	const { pathname, search } = useLocation();

	const params = useUrlQuery();

	const isFullViewOpen = params.get(QueryParams.expandedWidgetId) === widget.id;

	const lineChartRef = useRef<ToggleGraphProps>();
	const [graphVisibility, setGraphVisibility] = useState<boolean[]>(
		Array(queryResponse.data?.payload?.data?.result?.length || 0).fill(true),
	);
	const graphRef = useRef<HTMLDivElement>(null);

	const [currentGraphRef, setCurrentGraphRef] =
		useState<RefObject<HTMLDivElement> | null>(graphRef);

	useEffect(() => {
		if (!lineChartRef.current) {
			return;
		}

		graphVisibility.forEach((state, index) => {
			lineChartRef.current?.toggleGraph(index, state);
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const tableProcessedDataRef = useRef<RowData[]>([]);

	const navigateToExplorerPages = useNavigateToExplorerPages();

	const handleOnView = (): void => {
		const queryParams = {
			[QueryParams.expandedWidgetId]: widget.id,
		};
		const updatedSearch = createQueryParams(queryParams);
		const existingSearch = new URLSearchParams(search);
		const isExpandedWidgetIdPresent = existingSearch.has(
			QueryParams.expandedWidgetId,
		);
		if (isExpandedWidgetIdPresent) {
			existingSearch.delete(QueryParams.expandedWidgetId);
		}
		const separator = existingSearch.toString() ? '&' : '';
		const newSearch = `${existingSearch}${separator}${updatedSearch}`;

		safeNavigate({
			pathname,
			search: newSearch,
		});
	};

	const onToggleModelHandler = (): void => {
		const existingSearchParams = new URLSearchParams(search);
		existingSearchParams.delete(QueryParams.expandedWidgetId);
		existingSearchParams.delete(QueryParams.compositeQuery);
		existingSearchParams.delete(QueryParams.graphType);
		const updatedQueryParams = Object.fromEntries(existingSearchParams.entries());
		if (queryResponse.data?.payload) {
			const { graphVisibilityStates: localStoredVisibilityState } =
				getLocalStorageGraphVisibilityState({
					apiResponse: queryResponse.data?.payload?.data?.result,
					name: widget.id,
				});
			setGraphVisibility(localStoredVisibilityState);
		}
		safeNavigate({
			pathname,
			search: createQueryParams(updatedQueryParams),
		});
	};

	const [searchTerm, setSearchTerm] = useState<string>('');

	const graphClick = useGraphClickToShowButton({
		graphRef: currentGraphRef?.current ? currentGraphRef : graphRef,
		isButtonEnabled: (widget?.query?.builder?.queryData &&
		Array.isArray(widget.query.builder.queryData)
			? widget.query.builder.queryData
			: []
		).some(
			(q) =>
				q.dataSource === DataSource.TRACES || q.dataSource === DataSource.LOGS,
		),
		buttonClassName: 'view-onclick-show-button',
	});

	const navigateToExplorer = useNavigateToExplorer();

	const graphClickHandler = (
		xValue: number,
		yValue: number,
		mouseX: number,
		mouseY: number,
		metric?: { [key: string]: string },
		queryData?: { queryName: string; inFocusOrNot: boolean },
	): void => {
		const customTracesTimeRange = getCustomTimeRangeWindowSweepInMS(
			customTimeRangeWindowForCoRelation,
		);
		const { start, end } = getStartAndEndTimesInMilliseconds(
			xValue,
			customTracesTimeRange,
		);
		handleGraphClick({
			xValue,
			yValue,
			mouseX,
			mouseY,
			metric,
			queryData,
			widget,
			navigateToExplorerPages,
			navigateToExplorer,
			notifications,
			graphClick,
			...(customTimeRangeWindowForCoRelation
				? { customTracesTimeRange: { start, end } }
				: {}),
		});
	};

	const { truncatedText, fullText } = useGetResolvedText({
		text: widget.title as string,
		maxLength: 100,
	});

	return (
		<div
			style={{
				height: '100%',
			}}
			id={widget.id}
			className="widget-graph-component-container"
		>
			<Modal
				title={
					<Tooltip title={fullText} placement="top">
						<span>{truncatedText || fullText || 'View'}</span>
					</Tooltip>
				}
				footer={[]}
				centered
				open={isFullViewOpen}
				onCancel={onToggleModelHandler}
				width="85%"
				destroyOnClose
				className="widget-full-view"
			>
				<FullView
					name={`${widget.id}expanded`}
					version={version}
					originalName={widget.id}
					widget={widget}
					yAxisUnit={widget.yAxisUnit}
					onToggleModelHandler={onToggleModelHandler}
					tableProcessedDataRef={tableProcessedDataRef}
					onClickHandler={onClickHandler ?? graphClickHandler}
					customOnDragSelect={customOnDragSelect}
					setCurrentGraphRef={setCurrentGraphRef}
					enableDrillDown={
						enableDrillDown && widget?.query?.queryType === EQueryType.QUERY_BUILDER
					}
				/>
			</Modal>

			<div className="drag-handle">
				<WidgetHeader
					title={widget?.title}
					widget={widget}
					onView={handleOnView}
					queryResponse={queryResponse}
					threshold={threshold}
					headerMenuList={headerMenuList}
					isWarning={isWarning}
					isFetchingResponse={isFetchingResponse}
					tableProcessedDataRef={tableProcessedDataRef}
					setSearchTerm={setSearchTerm}
				/>
			</div>

			{queryResponse.error && customErrorMessage && (
				<div className="error-message-container">
					<Typography.Text color="warning">{customErrorMessage}</Typography.Text>
				</div>
			)}

			{queryResponse.isLoading && widget.panelTypes !== PANEL_TYPES.LIST && (
				<Skeleton />
			)}
			{(queryResponse.isSuccess || widget.panelTypes === PANEL_TYPES.LIST) && (
				<div
					className={cx(
						'widget-graph-container',
						`${widget.panelTypes}-panel-container`,
					)}
					ref={graphRef}
				>
					<PanelWrapper
						panelMode={PanelMode.DASHBOARD_VIEW}
						widget={widget}
						queryResponse={queryResponse}
						setRequestData={setRequestData}
						setGraphVisibility={setGraphVisibility}
						graphVisibility={graphVisibility}
						onClickHandler={onClickHandler ?? graphClickHandler}
						onDragSelect={onDragSelect}
						tableProcessedDataRef={tableProcessedDataRef}
						customTooltipElement={customTooltipElement}
						searchTerm={searchTerm}
						openTracesButton={openTracesButton}
						onOpenTraceBtnClick={onOpenTraceBtnClick}
						customSeries={customSeries}
						customOnRowClick={customOnRowClick}
						enableDrillDown={enableDrillDown}
						hidePagination={hidePagination}
					/>
				</div>
			)}
		</div>
	);
}

WidgetGraphComponent.defaultProps = {
	yAxisUnit: undefined,
	setLayout: undefined,
	onClickHandler: undefined,
	customTimeRangeWindowForCoRelation: undefined,
	enableDrillDown: false,
};

export default WidgetGraphComponent;
