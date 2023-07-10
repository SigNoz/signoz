import { Card, Typography } from 'antd';
// components
import ListLogView from 'components/Logs/ListLogView';
import RawLogView from 'components/Logs/RawLogView';
import LogsTableView from 'components/Logs/TableView';
import Spinner from 'components/Spinner';
import { contentStyle } from 'container/Trace/Search/config';
import useFontFaceObserver from 'hooks/useFontObserver';
import { memo, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Virtuoso } from 'react-virtuoso';
import { AppState } from 'store/reducers';
// interfaces
import { SET_DETAILED_LOG_DATA } from 'types/actions/logs';
import { ILog } from 'types/api/logs/log';
import { ILogsReducer } from 'types/reducer/logs';

// styles
import { Container, Heading } from './styles';

export type LogViewMode = 'raw' | 'table' | 'list';

type LogsTableProps = {
	viewMode: LogViewMode;
	linesPerRow: number;
	onClickExpand: (logData: ILog) => void;
};

function LogsTable(props: LogsTableProps): JSX.Element {
	const { viewMode, onClickExpand, linesPerRow } = props;

	const dispatch = useDispatch();

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

	const handleOpenDetailedView = useCallback(
		(logData: ILog) => {
			dispatch({
				type: SET_DETAILED_LOG_DATA,
				payload: logData,
			});
		},
		[dispatch],
	);

	const getItemContent = useCallback(
		(index: number): JSX.Element => {
			const log = logs[index];

			if (viewMode === 'raw') {
				return (
					<RawLogView
						key={log.id}
						data={log}
						linesPerRow={linesPerRow}
						onClickExpand={onClickExpand}
					/>
				);
			}

			return (
				<ListLogView
					key={log.id}
					logData={log}
					selectedFields={selected}
					onOpenDetailedView={handleOpenDetailedView}
				/>
			);
		},
		[
			logs,
			viewMode,
			selected,
			handleOpenDetailedView,
			linesPerRow,
			onClickExpand,
		],
	);

	const renderContent = useMemo(() => {
		if (viewMode === 'table') {
			return (
				<LogsTableView
					logs={logs}
					fields={selected}
					linesPerRow={linesPerRow}
					onClickExpand={onClickExpand}
				/>
			);
		}

		return (
			<Card bodyStyle={contentStyle}>
				<Virtuoso
					useWindowScroll
					totalCount={logs.length}
					itemContent={getItemContent}
				/>
			</Card>
		);
	}, [getItemContent, linesPerRow, logs, onClickExpand, selected, viewMode]);

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
		</Container>
	);
}

export default memo(LogsTable);
