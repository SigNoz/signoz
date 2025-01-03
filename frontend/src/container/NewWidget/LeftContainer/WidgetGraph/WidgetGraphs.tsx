import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import PanelWrapper from 'container/PanelWrapper/PanelWrapper';
import { CustomTimeType } from 'container/TopNav/DateTimeSelectionV2/config';
import { useIsDarkMode } from 'hooks/useDarkMode';
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
} from 'react';
import { UseQueryResult } from 'react-query';
import { useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { UpdateTimeInterval } from 'store/actions';
import { SuccessResponse } from 'types/api';
import { Widgets } from 'types/api/dashboard/getAll';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

function WidgetGraph({
	selectedWidget,
	queryResponse,
	setRequestData,
	selectedGraph,
}: WidgetGraphProps): JSX.Element {
	const graphRef = useRef<HTMLDivElement>(null);
	const dispatch = useDispatch();
	const urlQuery = useUrlQuery();
	const location = useLocation();
	const { safeNavigate } = useSafeNavigate();

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
}

export default WidgetGraph;
