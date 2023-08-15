import { Card, Typography } from 'antd';
import ListLogView from 'components/Logs/ListLogView';
import RawLogView from 'components/Logs/RawLogView';
import { LOCALSTORAGE } from 'constants/localStorage';
import InfinityTableView from 'container/LogsExplorerList/InfinityTableView';
import { InfinityWrapperStyled } from 'container/LogsExplorerList/styles';
import { convertKeysToColumnFields } from 'container/LogsExplorerList/utils';
import { Heading } from 'container/LogsTable/styles';
import { useOptionsMenu } from 'container/OptionsMenu';
import { contentStyle } from 'container/Trace/Search/config';
import { useCopyLogLink } from 'hooks/logs/useCopyLogLink';
import useFontFaceObserver from 'hooks/useFontObserver';
import { useEventSource } from 'providers/EventSource';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
// interfaces
import { ILog } from 'types/api/logs/log';
import { DataSource, StringOperators } from 'types/common/queryBuilder';

import { LiveLogsListProps } from './types';

function LiveLogsList({ logs }: LiveLogsListProps): JSX.Element {
	const ref = useRef<VirtuosoHandle>(null);

	const { isConnectionError } = useEventSource();

	const { activeLogId } = useCopyLogLink();

	const { options } = useOptionsMenu({
		storageKey: LOCALSTORAGE.LOGS_LIST_OPTIONS,
		dataSource: DataSource.LOGS,
		aggregateOperator: StringOperators.NOOP,
	});

	const activeLogIndex = useMemo(
		() => logs.findIndex(({ id }) => id === activeLogId),
		[logs, activeLogId],
	);

	useFontFaceObserver(
		[
			{
				family: 'Fira Code',
				weight: '300',
			},
		],
		options.format === 'raw',
		{
			timeout: 5000,
		},
	);

	const selectedFields = useMemo(
		() => convertKeysToColumnFields(options.selectColumns),
		[options],
	);

	const getItemContent = useCallback(
		(_: number, log: ILog): JSX.Element => {
			if (options.format === 'raw') {
				return (
					<RawLogView key={log.id} data={log} linesPerRow={options.maxLines} />
				);
			}

			return (
				<ListLogView key={log.id} logData={log} selectedFields={selectedFields} />
			);
		},
		[options.format, options.maxLines, selectedFields],
	);

	useEffect(() => {
		if (!activeLogId || activeLogIndex < 0) return;

		ref?.current?.scrollToIndex({
			index: activeLogIndex,
			align: 'start',
			behavior: 'smooth',
		});
	}, [activeLogId, activeLogIndex]);

	const renderContent = useMemo(() => {
		if (options.format === 'table') {
			return (
				<InfinityTableView
					ref={ref}
					isLoading={false}
					tableViewProps={{
						logs,
						fields: selectedFields,
						linesPerRow: options.maxLines,
						appendTo: 'end',
					}}
				/>
			);
		}

		return (
			<Card style={{ width: '100%' }} bodyStyle={{ ...contentStyle }}>
				<Virtuoso
					ref={ref}
					useWindowScroll
					data={logs}
					totalCount={logs.length}
					itemContent={getItemContent}
				/>
			</Card>
		);
	}, [logs, options.format, options.maxLines, getItemContent, selectedFields]);

	return (
		<>
			{options.format !== 'table' && (
				<Heading>
					<Typography.Text>Event</Typography.Text>
				</Heading>
			)}

			{logs.length === 0 && <Typography>No logs lines found</Typography>}

			{!isConnectionError && (
				<InfinityWrapperStyled>{renderContent}</InfinityWrapperStyled>
			)}
		</>
	);
}

export default memo(LiveLogsList);
