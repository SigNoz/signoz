import * as Sentry from '@sentry/react';
import { Card } from 'antd';
import { NotificationInstance } from 'antd/es/notification/interface';
import ROUTES from 'constants/routes';
import Filters from 'container/Trace/Filters';
import TraceGraph from 'container/Trace/Graph';
import Search from 'container/Trace/Search';
import TraceGraphFilter from 'container/Trace/TraceGraphFilter';
import TraceTable from 'container/Trace/TraceTable';
import { useNotifications } from 'hooks/useNotifications';
import getStep from 'lib/getStep';
import history from 'lib/history';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
import { MouseEventHandler, useCallback, useEffect, useState } from 'react';
import { connect, useDispatch, useSelector } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { GetInitialTraceFilter } from 'store/actions/trace/getInitialFilter';
import {
	GetSpansAggregate,
	GetSpansAggregateProps,
} from 'store/actions/trace/getInitialSpansAggregate';
import { GetSpans, GetSpansProps } from 'store/actions/trace/getSpans';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { RESET_TRACE_FILTER } from 'types/actions/trace';
import { GlobalReducer } from 'types/reducer/globalTime';
import { TraceReducer } from 'types/reducer/trace';

import {
	ClearAllFilter,
	Container,
	LeftContainer,
	RightContainer,
} from './styles';

function Trace({
	getSpansAggregate,
	getSpans,
	getInitialFilter,
}: Props): JSX.Element {
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const dispatch = useDispatch<Dispatch<AppActions>>();

	const [isChanged, setIsChanged] = useState<boolean>(true);

	const {
		selectedFilter,
		spansAggregate,
		selectedTags,
		selectedFunction,
		selectedGroupBy,
		isFilterExclude,
		spanKind,
	} = useSelector<AppState, TraceReducer>((state) => state.traces);

	const { notifications } = useNotifications();

	useEffect(() => {
		getInitialFilter(minTime, maxTime, notifications);
	}, [maxTime, minTime, getInitialFilter, isChanged, notifications]);

	useEffect(() => {
		getSpansAggregate(
			{
				maxTime,
				minTime,
				selectedFilter,
				current: spansAggregate.currentPage,
				pageSize: spansAggregate.pageSize,
				selectedTags,
				order: spansAggregate.order,
				orderParam: spansAggregate.orderParam,
				spanKind,
			},
			notifications,
		);
	}, [
		selectedTags,
		selectedFilter,
		maxTime,
		minTime,
		getSpansAggregate,
		spansAggregate.currentPage,
		spansAggregate.pageSize,
		spansAggregate.order,
		spansAggregate.orderParam,
		notifications,
		spanKind,
	]);

	useEffect(() => {
		getSpans(
			{
				end: maxTime,
				function: selectedFunction,
				groupBy: selectedGroupBy,
				selectedFilter,
				selectedTags,
				start: minTime,
				step: getStep({ start: minTime, end: maxTime, inputFormat: 'ns' }),
				isFilterExclude,
				spanKind,
			},
			notifications,
		);
	}, [
		selectedFunction,
		selectedGroupBy,
		selectedFilter,
		selectedTags,
		maxTime,
		minTime,
		getSpans,
		isFilterExclude,
		notifications,
		spanKind,
	]);

	useEffect(
		() => (): void => {
			dispatch({
				type: RESET_TRACE_FILTER,
			});
		},
		[dispatch],
	);

	const onClickHandler: MouseEventHandler<HTMLElement> = useCallback(
		(e) => {
			e.preventDefault();
			e.stopPropagation();

			history.replace(ROUTES.TRACE);

			dispatch({
				type: RESET_TRACE_FILTER,
			});

			setIsChanged((state) => !state);
		},
		[dispatch],
	);

	return (
		<Sentry.ErrorBoundary fallback={<ErrorBoundaryFallback />}>
			<Search />
			<Container>
				<div>
					<ClearAllFilter onClick={onClickHandler} type="primary">
						Clear all filters
					</ClearAllFilter>
					<LeftContainer>
						<Filters />
					</LeftContainer>
				</div>

				<RightContainer>
					<Card>
						<TraceGraphFilter />
						<TraceGraph />
					</Card>

					<Card style={{ marginTop: '2rem' }}>
						<TraceTable />
					</Card>
				</RightContainer>
			</Container>
		</Sentry.ErrorBoundary>
	);
}

interface DispatchProps {
	getSpansAggregate: (
		props: GetSpansAggregateProps,
		notify: NotificationInstance,
	) => void;
	getSpans: (props: GetSpansProps, notify: NotificationInstance) => void;
	getInitialFilter: (
		minTime: GlobalReducer['minTime'],
		maxTime: GlobalReducer['maxTime'],
		notify: NotificationInstance,
	) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	getInitialFilter: bindActionCreators(GetInitialTraceFilter, dispatch),
	getSpansAggregate: bindActionCreators(GetSpansAggregate, dispatch),
	getSpans: bindActionCreators(GetSpans, dispatch),
});

type Props = DispatchProps;

export default connect(null, mapDispatchToProps)(Trace);
