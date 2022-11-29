/* eslint-disable no-nested-ternary */
import { Typography } from 'antd';
import LogItem from 'components/Logs/LogItem';
import Spinner from 'components/Spinner';
import { map } from 'lodash-es';
import React, { memo } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { ILogsReducer } from 'types/reducer/logs';

import { Container, Heading } from './styles';

function LogsTable(): JSX.Element {
	const { logs, isLoading, liveTail } = useSelector<AppState, ILogsReducer>(
		(state) => state.logs,
	);

	if (isLoading) {
		return <Spinner height={20} tip="Getting Logs" />;
	}

	return (
		<Container flex="auto">
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

export default memo(LogsTable);
