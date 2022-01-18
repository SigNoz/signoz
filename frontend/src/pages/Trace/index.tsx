import Filters from 'container/Trace/Filters';
import Search from 'container/Trace/Search';
import TraceGraphFilter from 'container/Trace/TraceGraphFilter';
import TraceTable from 'container/Trace/TraceTable';
import React, { useEffect } from 'react';
import { connect, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { bindActionCreators } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { GetFilter } from 'store/actions/trace/getFilters';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { GlobalReducer } from 'types/reducer/globalTime';

import { Container, LeftContainer, RightContainer } from './styles';

const Trace = ({ getFilters }: Props): JSX.Element => {
	const { search } = useLocation();

	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	useEffect(() => {
		if (search) {
			getFilters(search, minTime, maxTime);
		}
	}, [search, minTime, maxTime, getFilters]);

	return (
		<>
			<Search />
			<Container>
				<LeftContainer>
					<Filters />
				</LeftContainer>

				<RightContainer>
					<TraceGraphFilter />
					{/* <TraceGraph /> */}
					<TraceTable />
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
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	getFilters: bindActionCreators(GetFilter, dispatch),
});

type Props = DispatchProps;

export default connect(null, mapDispatchToProps)(Trace);
