import { blue } from '@ant-design/colors';
import Graph from 'components/Graph';
import Spinner from 'components/Spinner';
import getStep from 'lib/getStep';
import React, { memo, useEffect } from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { getLogsAggregate } from 'store/actions/logs/getLogsAggregate';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { GlobalReducer } from 'types/reducer/globalTime';
import ILogsReducer from 'types/reducer/logs';

import { Container } from './styles';

function LogsAggregate({ getLogsAggregate }) {
	const {
		searchFilter: { queryString },
		logs,
		logLinesPerPage,
		idEnd,
		idStart,
		isLoading,
		isLoadingAggregate,
		logsAggregate,
	} = useSelector<AppState, ILogsReducer>((state) => state.logs);

	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	useEffect(() => {
		getLogsAggregate({
			timestampStart: minTime,
			timestampEnd: maxTime,
			step: getStep({
				start: minTime,
				end: maxTime,
				inputFormat: 'ns',
			}),
			q: queryString,
		});
	}, [getLogsAggregate, maxTime, minTime]);

	const data = {
		labels: logsAggregate.map((s) => new Date(s.timestamp / 1000000)),
		datasets: [
			{
				// label: 'Span Count',
				data: logsAggregate.map((s) => s.value),
				backgroundColor: blue[4],
			},
		],
	};

	return (
		<Container>
			{isLoadingAggregate ? (
				<Spinner size="default" height="100%" />
			) : (
				<Graph name="usage" data={data} type="bar" containerHeight="100%" />
			)}
		</Container>
	);
}

interface DispatchProps {
	getLogsAggregate: () => (dispatch: Dispatch<AppActions>) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	getLogsAggregate: bindActionCreators(getLogsAggregate, dispatch),
});

export default connect(null, mapDispatchToProps)(memo(LogsAggregate));
