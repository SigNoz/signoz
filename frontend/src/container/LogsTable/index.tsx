import { fetchEventSource } from '@microsoft/fetch-event-source';
import { Card, Typography } from 'antd';
import { LiveTail } from 'api/logs/livetail';
import LogItem from 'components/Logs/LogItem';
import Spinner from 'components/Spinner';
import { map } from 'lodash-es';
import React, { memo, useEffect, useRef } from 'react';
import { connect, useDispatch, useSelector } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { getLogs } from 'store/actions/logs/getLogs';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { PUSH_LIVE_TAIL_EVENT } from 'types/actions/logs';
import { GlobalReducer } from 'types/reducer/globalTime';
import ILogsReducer from 'types/reducer/logs';

import { Container, Heading } from './styles';

function LogsTable({ getLogs }) {
	const {
		searchFilter: { queryString },
		logs,
		logLinesPerPage,
		idEnd,
		idStart,
		isLoading,
		liveTail,
	} = useSelector<AppState, ILogsReducer>((state) => state.logs);

	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	useEffect(() => {
		if (liveTail === 'STOPPED')
			getLogs({
				q: queryString,
				limit: logLinesPerPage,
				orderBy: 'timestamp',
				order: 'desc',
				timestampStart: minTime,
				timestampEnd: maxTime,
				...(idStart ? { idGt: idStart } : {}),
				...(idEnd ? { idLt: idEnd } : {}),
			});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [getLogs, idEnd, idStart, logLinesPerPage, maxTime, minTime, liveTail]);

	if (isLoading) {
		return <Spinner height={20} tip="Getting Logs" />;
	}
	return (
		<Container>
			<Heading>
				<Typography.Text
					style={{
						fontSize: '1rem',
						fontWeight: 400,
					}}
				>
					Event
				</Typography.Text>
			</Heading>
			{Array.isArray(logs) && logs.length > 0 ? (
				map(logs, (log) => <LogItem key={log.id} logData={log} />)
			) : liveTail === 'PLAYING' ? (
				<span>Getting live logs...</span>
			) : (
				<span>No log lines found</span>
			)}
		</Container>
	);
}

interface DispatchProps {
	getLogs: () => (dispatch: Dispatch<AppActions>) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	getLogs: bindActionCreators(getLogs, dispatch),
});

export default connect(null, mapDispatchToProps)(memo(LogsTable));
