import { Card, Typography } from 'antd';
// components
import ListLogView from 'components/Logs/ListLogView';
import RawLogView from 'components/Logs/RawLogView';
import LogsTableView from 'components/Logs/TableView';
import Spinner from 'components/Spinner';
import { LogViewMode } from 'container/LogsTable';
import { Container, Heading } from 'container/LogsTable/styles';
import { contentStyle } from 'container/Trace/Search/config';
import useFontFaceObserver from 'hooks/useFontObserver';
import { memo, useCallback, useMemo, useState } from 'react';
import { Virtuoso } from 'react-virtuoso';
// interfaces
import { ILog } from 'types/api/logs/log';

import { LogsExplorerListProps } from './LogsExplorerList.interfaces';

function LogsExplorerList({
	data,
	isLoading,
}: LogsExplorerListProps): JSX.Element {
	const [viewMode] = useState<LogViewMode>('raw');
	const [linesPerRow] = useState<number>(20);

	const logs: ILog[] = useMemo(() => {
		if (data.length > 0 && data[0].list) {
			const logs: ILog[] = data[0].list.map((item) => ({
				timestamp: +item.timestamp,
				...item.data,
			}));

			return logs;
		}

		return [];
	}, [data]);

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
	// TODO: implement here linesPerRow, mode like in useSelectedLogView

	const getItemContent = useCallback(
		(index: number): JSX.Element => {
			const log = logs[index];

			if (viewMode === 'raw') {
				return (
					<RawLogView
						key={log.id}
						data={log}
						linesPerRow={linesPerRow}
						// TODO: write new onClickExpanded logic
						onClickExpand={(): void => {}}
					/>
				);
			}

			return <ListLogView key={log.id} logData={log} />;
		},
		[logs, linesPerRow, viewMode],
	);

	const renderContent = useMemo(() => {
		if (viewMode === 'table') {
			return (
				<LogsTableView
					logs={logs}
					// TODO: write new selected logic
					fields={[]}
					linesPerRow={linesPerRow}
					// TODO: write new onClickExpanded logic
					onClickExpand={(): void => {}}
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
	}, [getItemContent, linesPerRow, logs, viewMode]);

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

			{logs.length === 0 && <Typography>No logs lines found</Typography>}

			{renderContent}
		</Container>
	);
}

export default memo(LogsExplorerList);
