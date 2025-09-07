import { useNavigateToExplorer } from 'components/CeleryTask/useNavigateToExplorer';
import { ToggleGraphProps } from 'components/Graph/types';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { handleGraphClick } from 'container/GridCardLayout/GridCard/utils';
import { useGraphClickToShowButton } from 'container/GridCardLayout/useGraphClickToShowButton';
import useNavigateToExplorerPages from 'container/GridCardLayout/useNavigateToExplorerPages';
import PanelWrapper from 'container/PanelWrapper/PanelWrapper';
import { CustomTimeType } from 'container/TopNav/DateTimeSelectionV2/config';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useNotifications } from 'hooks/useNotifications';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import GetMinMax from 'lib/getMinMax';
import getTimeString from 'lib/getTimeString';
import {
	Dispatch,
	SetStateAction,
	useCallback,
	useEffect,
	useRef,
	useState,
} from 'react';
import { UseQueryResult } from 'react-query';
import { useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { UpdateTimeInterval } from 'store/actions';
import { SuccessResponse } from 'types/api';
import { Widgets } from 'types/api/dashboard/getAll';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { DataSource } from 'types/common/queryBuilder';

function WidgetGraph({
	selectedWidget,
	queryResponse,
	setRequestData,
	selectedGraph,
	enableDrillDown = false,
}: WidgetGraphProps): JSX.Element {
	const graphRef = useRef<HTMLDivElement>(null);
	const lineChartRef = useRef<ToggleGraphProps>();
	const dispatch = useDispatch();
	const urlQuery = useUrlQuery();
	const location = useLocation();
	const { safeNavigate } = useSafeNavigate();

	// Add legend state management similar to dashboard components
	const [graphVisibility, setGraphVisibility] = useState<boolean[]>(
		Array((queryResponse.data?.payload?.data?.result?.length || 0) + 1).fill(
			true,
		),
	);

	// Initialize graph visibility when data changes
	useEffect(() => {
		if (queryResponse.data?.payload?.data?.result) {
			setGraphVisibility(
				Array(queryResponse.data.payload.data.result.length + 1).fill(true),
			);
		}
	}, [queryResponse.data?.payload?.data?.result]);

	// Apply graph visibility when lineChartRef is available
	useEffect(() => {
		if (!lineChartRef.current) return;

		graphVisibility.forEach((state, index) => {
			lineChartRef.current?.toggleGraph(index, state);
		});
	}, [graphVisibility]);

	const handleBackNavigation = (): void => {
		const searchParams = new URLSearchParams(window.location.search);
		const startTime = searchParams.get(QueryParams.startTime);
		const endTime = searchParams.get(QueryParams.endTime);
		const relativeTime = searchParams.get(
			QueryParams.relativeTime,
		) as CustomTimeType;

		if (relativeTime) {
			dispatch(UpdateTimeInterval(relativeTime));
		} else if (startTime && endTime && startTime !== endTime) {
			dispatch(
				UpdateTimeInterval('custom', [
					parseInt(getTimeString(startTime), 10),
					parseInt(getTimeString(endTime), 10),
				]),
			);
		}
	};

	const onDragSelect = useCallback(
		(start: number, end: number): void => {
			const startTimestamp = Math.trunc(start);
			const endTimestamp = Math.trunc(end);

			if (startTimestamp !== endTimestamp) {
				dispatch(UpdateTimeInterval('custom', [startTimestamp, endTimestamp]));
			}

			const { maxTime, minTime } = GetMinMax('custom', [
				startTimestamp,
				endTimestamp,
			]);

			urlQuery.set(QueryParams.startTime, minTime.toString());
			urlQuery.set(QueryParams.endTime, maxTime.toString());
			const generatedUrl = `${location.pathname}?${urlQuery.toString()}`;
			safeNavigate(generatedUrl);
		},
		[dispatch, location.pathname, safeNavigate, urlQuery],
	);

	useEffect(() => {
		window.addEventListener('popstate', handleBackNavigation);

		return (): void => {
			window.removeEventListener('popstate', handleBackNavigation);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const isDarkMode = useIsDarkMode();

	// context redirection to explorer pages
	const graphClick = useGraphClickToShowButton({
		graphRef,
		isButtonEnabled: (selectedWidget?.query?.builder?.queryData &&
		Array.isArray(selectedWidget.query.builder.queryData)
			? selectedWidget.query.builder.queryData
			: []
		).some(
			(q) =>
				q.dataSource === DataSource.TRACES || q.dataSource === DataSource.LOGS,
		),
		buttonClassName: 'view-onclick-show-button',
	});

	const navigateToExplorer = useNavigateToExplorer();
	const navigateToExplorerPages = useNavigateToExplorerPages();
	const { notifications } = useNotifications();

	const graphClickHandler = (
		xValue: number,
		yValue: number,
		mouseX: number,
		mouseY: number,
		metric?: { [key: string]: string },
		queryData?: { queryName: string; inFocusOrNot: boolean },
	): void => {
		handleGraphClick({
			xValue,
			yValue,
			mouseX,
			mouseY,
			metric,
			queryData,
			widget: selectedWidget,
			navigateToExplorerPages,
			navigateToExplorer,
			notifications,
			graphClick,
		});
	};

	return (
		<div
			ref={graphRef}
			style={{
				height: '100%',
				width: '100%',
				marginTop: '16px',
				borderRadius: '3px',
				border: isDarkMode
					? '1px solid var(--bg-slate-500)'
					: '1px solid var(--bg-vanilla-300)',
				background: isDarkMode
					? 'linear-gradient(0deg, rgba(171, 189, 255, 0.00) 0%, rgba(171, 189, 255, 0.00) 100%), #0B0C0E'
					: 'var(--bg-vanilla-100)',
			}}
		>
			<PanelWrapper
				widget={selectedWidget}
				queryResponse={queryResponse}
				setRequestData={setRequestData}
				onDragSelect={onDragSelect}
				selectedGraph={selectedGraph}
				onClickHandler={graphClickHandler}
				graphVisibility={graphVisibility}
				setGraphVisibility={setGraphVisibility}
				enableDrillDown={enableDrillDown}
			/>
		</div>
	);
}

interface WidgetGraphProps {
	selectedWidget: Widgets;
	queryResponse: UseQueryResult<
		SuccessResponse<MetricRangePayloadProps, unknown>,
		Error
	>;
	setRequestData: Dispatch<SetStateAction<GetQueryResultsProps>>;
	selectedGraph: PANEL_TYPES;
	enableDrillDown?: boolean;
}

export default WidgetGraph;

WidgetGraph.defaultProps = {
	enableDrillDown: false,
};
