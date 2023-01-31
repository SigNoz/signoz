import { Typography } from 'antd';
import LogItem from 'components/Logs/LogItem';
import Spinner from 'components/Spinner';
import React, { memo, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Virtuoso } from 'react-virtuoso';
import { AppState } from 'store/reducers';
import { ILogsReducer } from 'types/reducer/logs';

import { Container, Heading } from './styles';

function LogsTable(): JSX.Element {
	const { logs, isLoading, liveTail } = useSelector<AppState, ILogsReducer>(
		(state) => state.logs,
	);

	const isLiveTail = useMemo(() => logs.length === 0 && liveTail === 'PLAYING', [
		logs?.length,
		liveTail,
	]);

	const isNoLogs = useMemo(() => logs.length === 0 && liveTail === 'STOPPED', [
		logs?.length,
		liveTail,
	]);

	const getItemContent = useCallback(
		(index: number): JSX.Element => {
			const log = logs[index];
			return <LogItem key={log.id} logData={log} />;
		},
		[logs],
	);

	if (isLoading) {
		return <Spinner height={20} tip="Getting Logs" />;
	}

	return (
		<Container flex="auto">
			<Heading>
				<Typography.Text>Event</Typography.Text>
			</Heading>
			{isLiveTail && <Typography>Getting live logs...</Typography>}

			{isNoLogs && <Typography>No log lines found</Typography>}

			<Virtuoso
				useWindowScroll
				totalCount={logs.length}
				itemContent={getItemContent}
			/>
		</Container>
	);
}

export default memo(LogsTable);
