import './logsTable.styles.scss';

import { Card, Typography } from 'antd';
import LogDetail from 'components/LogDetail';
// components
import ListLogView from 'components/Logs/ListLogView';
import RawLogView from 'components/Logs/RawLogView';
import LogsTableView from 'components/Logs/TableView';
import Spinner from 'components/Spinner';
import { CARD_BODY_STYLE } from 'constants/card';
import { useActiveLog } from 'hooks/logs/useActiveLog';
import useFontFaceObserver from 'hooks/useFontObserver';
import { memo, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Virtuoso } from 'react-virtuoso';
import { AppState } from 'store/reducers';
// interfaces
import { ILogsReducer } from 'types/reducer/logs';

// styles
import { Container, Heading } from './styles';

export type LogViewMode = 'raw' | 'table' | 'list';

type LogsTableProps = {
	viewMode: LogViewMode;
	linesPerRow: number;
};

function LogsTable(props: LogsTableProps): JSX.Element {
	const { viewMode, linesPerRow } = props;

	const {
		activeLog,
		onClearActiveLog,
		onAddToQuery,
		onSetActiveLog,
	} = useActiveLog();

	useFontFaceObserver(
		[
			{
				family: 'Fira Code',
				weight: '300',
			},
		],
		viewMode === 'raw',
		{
			timeout: 5000,
		},
	);

	const {
		logs,
		fields: { selected },
		isLoading,
		liveTail,
	} = useSelector<AppState, ILogsReducer>((state) => state.logs);

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

			if (viewMode === 'raw') {
				return <RawLogView key={log.id} data={log} linesPerRow={linesPerRow} />;
			}

			return (
				<ListLogView
					key={log.id}
					logData={log}
					selectedFields={selected}
					onAddToQuery={onAddToQuery}
					onSetActiveLog={onSetActiveLog}
				/>
			);
		},
		[logs, viewMode, selected, onAddToQuery, onSetActiveLog, linesPerRow],
	);

	const renderContent = useMemo(() => {
		if (viewMode === 'table') {
			return (
				<LogsTableView
					onClickExpand={onSetActiveLog}
					logs={logs}
					fields={selected}
					linesPerRow={linesPerRow}
				/>
			);
		}

		return (
			<Card className="logs-card" bodyStyle={CARD_BODY_STYLE}>
				<Virtuoso totalCount={logs.length} itemContent={getItemContent} />
			</Card>
		);
	}, [getItemContent, linesPerRow, logs, onSetActiveLog, selected, viewMode]);

	if (isLoading) {
		return <Spinner height={20} tip="Getting Logs" />;
	}

	return (
		<Container>
			{viewMode !== 'table' && (
				<Heading>
					<Typography.Text>Event</Typography.Text>
				</Heading>
			)}

			{isLiveTail && <Typography>Getting live logs...</Typography>}

			{isNoLogs && <Typography>No logs lines found</Typography>}

			{renderContent}
			<LogDetail
				log={activeLog}
				onClose={onClearActiveLog}
				onAddToQuery={onAddToQuery}
				onClickActionItem={onAddToQuery}
			/>
		</Container>
	);
}

export default memo(LogsTable);
