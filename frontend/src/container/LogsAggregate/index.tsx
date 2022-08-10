import { blue } from '@ant-design/colors';
import Graph from 'components/Graph';
import Spinner from 'components/Spinner';
import dayjs from 'dayjs';
import getStep from 'lib/getStep';
import React, { memo, useEffect, useRef } from 'react';
import { connect, useDispatch, useSelector } from 'react-redux';
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
		liveTail,
		liveTailStartRange,
	} = useSelector<AppState, ILogsReducer>((state) => state.logs);

	const dispatch = useDispatch();
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const reFetchIntervalRef = useRef(null);
	useEffect(() => {
		// console.log('LIVE TAIL LOG AGG', liveTail)
		switch (liveTail) {
			case 'STOPPED': {
				if (reFetchIntervalRef.current) {
					clearInterval(reFetchIntervalRef.current);
				}
				reFetchIntervalRef.current = null;
				getLogsAggregate({
					timestampStart: minTime,
					timestampEnd: maxTime,
					step: getStep({
						start: minTime,
						end: maxTime,
						inputFormat: 'ns',
					}),
					q: queryString,
					...(idStart ? { idGt: idStart } : {}),
					...(idEnd ? { idLt: idEnd } : {}),
				});
				break;
			}

			case 'PLAYING': {
				const aggregateCall = () => {
					const startTime =
						dayjs().subtract(liveTailStartRange, 'minute').valueOf() * 1e6;
					const endTime = dayjs().valueOf() * 1e6;
					getLogsAggregate({
						timestampStart: startTime,
						timestampEnd: endTime,
						step: getStep({
							start: startTime,
							end: endTime,
							inputFormat: 'ns',
						}),
						q: queryString,
						...(idStart ? {idGt:  idStart } : {}),
						...(idEnd ? { idLt: idEnd } : {}),
					});
				};
				aggregateCall();
				reFetchIntervalRef.current = setInterval(aggregateCall, 60000);
				// console.log('LA Play', reFetchIntervalRef.current);
				break;
			}
			case 'PAUSED': {
				// console.log('LA Pause', reFetchIntervalRef.current);
				if (reFetchIntervalRef.current) {
					clearInterval(reFetchIntervalRef.current);
				}
				break;
			}
			default: {
				break;
			}
		}
	}, [getLogsAggregate, maxTime, minTime, liveTail]);

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
				<Graph
					name="usage"
					data={data}
					type="bar"
					containerHeight="100%"
					animate={false}
				/>
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
