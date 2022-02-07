import { Card } from 'antd';
import ROUTES from 'constants/routes';
import Filters from 'container/Trace/Filters';
import TraceGraph from 'container/Trace/Graph';
import Search from 'container/Trace/Search';
import TraceGraphFilter from 'container/Trace/TraceGraphFilter';
import TraceTable from 'container/Trace/TraceTable';
import history from 'lib/history';
import React, { useCallback, useEffect } from 'react';
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
	Container,
	LeftContainer,
	RightContainer,
	ClearAllFilter,
	LeftWrapper,
} from './styles';

const Trace = ({
	getSpansAggregate,
	getSpans,
	getInitialFilter,
}: Props): JSX.Element => {
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const dispatch = useDispatch<Dispatch<AppActions>>();

	const {
		selectedFilter,
		spansAggregate,
		selectedTags,
		selectedFunction,
		selectedGroupBy,
		filterLoading,
		isFilterExclude,
	} = useSelector<AppState, TraceReducer>((state) => state.traces);

	useEffect(() => {
		if (filterLoading) {
			getInitialFilter(minTime, maxTime);
		}
	}, [maxTime, minTime, getInitialFilter, filterLoading]);

	useEffect(() => {
		if (!filterLoading)
			getSpansAggregate({
				maxTime: maxTime,
				minTime: minTime,
				selectedFilter,
				current: spansAggregate.currentPage,
				pageSize: spansAggregate.pageSize,
				selectedTags,
			});
	}, [selectedTags, filterLoading, selectedFilter, maxTime, minTime]);

	useEffect(() => {
		if (!filterLoading)
			getSpans({
				end: maxTime,
				function: selectedFunction,
				groupBy: selectedGroupBy,
				selectedFilter,
				selectedTags,
				start: minTime,
				step: 60,
				isFilterExclude,
			});
	}, [
		selectedFunction,
		selectedGroupBy,
		selectedFilter,
		selectedTags,
		filterLoading,
		maxTime,
		minTime,
	]);

	useEffect(() => {
		return () => {
			dispatch({
				type: RESET_TRACE_FILTER,
			});
		};
	}, []);

	const onClickHandler = useCallback(() => {
		dispatch({
			type: RESET_TRACE_FILTER,
		});
		history.replace(ROUTES.TRACE);
	}, []);

	return (
		<>
			<Search />
			<Container>
				<LeftWrapper>
					<ClearAllFilter onClick={onClickHandler} type="primary">
						Clear all filters
					</ClearAllFilter>
					<LeftContainer>
						<Filters />
					</LeftContainer>
				</LeftWrapper>

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
		</>
	);
};

interface DispatchProps {
	getSpansAggregate: (props: GetSpansAggregateProps) => void;
	getSpans: (props: GetSpansProps) => void;
	getInitialFilter: (
		minTime: GlobalReducer['minTime'],
		maxTime: GlobalReducer['maxTime'],
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
