import LogItem from 'components/Logs/LogItem';
import { map } from 'lodash-es';
import React, { memo, useEffect } from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { getLogs } from 'store/actions/logs/getLogs';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import ILogsReducer from 'types/reducer/logs';

import { Container } from './styles';

function LogsTable({ getLogs }) {
	const {
		searchFilter: { queryString },
		logs,
	} = useSelector<AppState, ILogsReducer>((state) => state.logs);

	useEffect(() => {
		getLogs({
			q: queryString,
			limit: 10,
			orderBy: 'timestamp',
			order: 'desc',
		});
	}, [getLogs, queryString]);
	return (
		<Container>
			{Array.isArray(logs) && logs.length > 0 ? (
				map(logs, (log) => <LogItem key={log.id} logData={log} />)
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
