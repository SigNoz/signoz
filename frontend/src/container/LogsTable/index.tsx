import './logsTable.styles.scss';

import { Card, Typography } from 'antd';
import LogDetail from 'components/LogDetail';
import { VIEW_TYPES } from 'components/LogDetail/constants';
// components
import ListLogView from 'components/Logs/ListLogView';
import RawLogView from 'components/Logs/RawLogView';
import LogsTableView from 'components/Logs/TableView';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import Spinner from 'components/Spinner';
import { CARD_BODY_STYLE } from 'constants/card';
import { LOCALSTORAGE } from 'constants/localStorage';
import { useOptionsMenu } from 'container/OptionsMenu';
import { useActiveLog } from 'hooks/logs/useActiveLog';
import { memo, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Virtuoso } from 'react-virtuoso';
import { AppState } from 'store/reducers';
import { DataSource, StringOperators } from 'types/common/queryBuilder';
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
		onGroupByAttribute,
		onSetActiveLog,
	} = useActiveLog();

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

	const { options } = useOptionsMenu({
		storageKey: LOCALSTORAGE.LOGS_LIST_OPTIONS,
		// this component will alwyays be called on old logs explorer page itself!
		dataSource: DataSource.LOGS,
		// and we do not have table / timeseries aggregated views in the old logs explorer!
		aggregateOperator: StringOperators.NOOP,
	});

	const getItemContent = useCallback(
		(index: number): JSX.Element => {
			const log = logs[index];

			if (viewMode === 'raw') {
				return (
					<RawLogView
						key={log.id}
						data={log}
						linesPerRow={linesPerRow}
						selectedFields={selected}
						fontSize={options.fontSize}
					/>
				);
			}

			return (
				<ListLogView
					key={log.id}
					logData={log}
					selectedFields={selected}
					linesPerRow={linesPerRow}
					onAddToQuery={onAddToQuery}
					onSetActiveLog={onSetActiveLog}
					fontSize={options.fontSize}
				/>
			);
		},
		[
			logs,
			viewMode,
			selected,
			linesPerRow,
			onAddToQuery,
			onSetActiveLog,
			options.fontSize,
		],
	);

	const renderContent = useMemo(() => {
		if (viewMode === 'table') {
			return (
				<LogsTableView
					onClickExpand={onSetActiveLog}
					logs={logs}
					fields={selected}
					linesPerRow={linesPerRow}
					fontSize={options.fontSize}
				/>
			);
		}

		return (
			<Card className="logs-card" bodyStyle={CARD_BODY_STYLE}>
				<OverlayScrollbar isVirtuoso>
					<Virtuoso totalCount={logs.length} itemContent={getItemContent} />
				</OverlayScrollbar>
			</Card>
		);
	}, [
		getItemContent,
		linesPerRow,
		logs,
		onSetActiveLog,
		options.fontSize,
		selected,
		viewMode,
	]);

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
				selectedTab={VIEW_TYPES.OVERVIEW}
				log={activeLog}
				onClose={onClearActiveLog}
				onGroupByAttribute={onGroupByAttribute}
				onAddToQuery={onAddToQuery}
				onClickActionItem={onAddToQuery}
			/>
		</Container>
	);
}

export default memo(LogsTable);
