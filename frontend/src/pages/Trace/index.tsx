import { Card } from 'antd';
import Filters from 'container/Trace/Filters';
import TraceGraph from 'container/Trace/Graph';
import Search from 'container/Trace/Search';
import TraceGraphFilter from 'container/Trace/TraceGraphFilter';
import TraceTable from 'container/Trace/TraceTable';
import React, { useEffect } from 'react';
import { connect, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { bindActionCreators } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { GetFilter } from 'store/actions/trace/getFilters';
import {
	GetSpansAggregate,
	GetSpansAggregateProps,
} from 'store/actions/trace/getInitialSpansAggregate';
import { GetSpans, GetSpansProps } from 'store/actions/trace/getSpans';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { GlobalReducer } from 'types/reducer/globalTime';
import { TraceReducer } from 'types/reducer/trace';

import { Container, LeftContainer, RightContainer } from './styles';

const Trace = ({
	getFilters,
	getSpansAggregate,
	getSpans,
}: Props): JSX.Element => {
	const { search } = useLocation();

	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	const {
		selectedFilter,
		spansAggregate,
		selectedTags,
		selectedFunction,
		selectedGroupBy,
	} = useSelector<AppState, TraceReducer>((state) => state.traces);

	useEffect(() => {
		getFilters(search, minTime, maxTime);
	}, [minTime, maxTime, getFilters, search]);

	useEffect(() => {
		getSpansAggregate({
			maxTime: maxTime,
			minTime: minTime,
			selectedFilter,
			current: spansAggregate.currentPage,
			pageSize: spansAggregate.pageSize,
			selectedTags,
		});
	}, [
		maxTime,
		minTime,
		selectedFilter,
		spansAggregate.currentPage,
		spansAggregate.pageSize,
		selectedTags,
	]);

	useEffect(() => {
		getSpans({
			end: maxTime,
			function: selectedFunction,
			groupBy: selectedGroupBy,
			selectedFilter,
			selectedTags,
			start: minTime,
			step: 60,
		});
	}, [
		selectedFunction,
		selectedGroupBy,
		selectedFilter,
		selectedTags,
		minTime,
		maxTime,
	]);

	return (
		<>
			<Search />
			<Container>
				<LeftContainer>
					<Filters />
				</LeftContainer>

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
	getFilters: (
		query: string,
		minTime: GlobalReducer['minTime'],
		maxTime: GlobalReducer['maxTime'],
	) => void;
	getSpansAggregate: (props: GetSpansAggregateProps) => void;
	getSpans: (props: GetSpansProps) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	getFilters: bindActionCreators(GetFilter, dispatch),
	getSpansAggregate: bindActionCreators(GetSpansAggregate, dispatch),
	getSpans: bindActionCreators(GetSpans, dispatch),
});

type Props = DispatchProps;

export default connect(null, mapDispatchToProps)(Trace);
