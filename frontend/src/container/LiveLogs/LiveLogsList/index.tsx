import { Card, Typography } from 'antd';
import LogDetail from 'components/LogDetail';
import { VIEW_TYPES } from 'components/LogDetail/constants';
import ListLogView from 'components/Logs/ListLogView';
import RawLogView from 'components/Logs/RawLogView';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import Spinner from 'components/Spinner';
import { CARD_BODY_STYLE } from 'constants/card';
import { LOCALSTORAGE } from 'constants/localStorage';
import { OptionFormatTypes } from 'constants/optionsFormatTypes';
import InfinityTableView from 'container/LogsExplorerList/InfinityTableView';
import { InfinityWrapperStyled } from 'container/LogsExplorerList/styles';
import { convertKeysToColumnFields } from 'container/LogsExplorerList/utils';
import { Heading } from 'container/LogsTable/styles';
import { useOptionsMenu } from 'container/OptionsMenu';
import { defaultLogsSelectedColumns } from 'container/OptionsMenu/constants';
import { useActiveLog } from 'hooks/logs/useActiveLog';
import { useCopyLogLink } from 'hooks/logs/useCopyLogLink';
import { useEventSource } from 'providers/EventSource';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
// interfaces
import { ILog } from 'types/api/logs/log';
import { DataSource, StringOperators } from 'types/common/queryBuilder';

import { LiveLogsListProps } from './types';

function LiveLogsList({ logs }: LiveLogsListProps): JSX.Element {
	const ref = useRef<VirtuosoHandle>(null);

	const { t } = useTranslation(['logs']);

	const { isConnectionLoading } = useEventSource();

	const { activeLogId } = useCopyLogLink();

	const {
		activeLog,
		onClearActiveLog,
		onAddToQuery,
		onGroupByAttribute,
		onSetActiveLog,
	} = useActiveLog();

	const { options } = useOptionsMenu({
		storageKey: LOCALSTORAGE.LOGS_LIST_OPTIONS,
		dataSource: DataSource.LOGS,
		aggregateOperator: StringOperators.NOOP,
	});

	const activeLogIndex = useMemo(
		() => logs.findIndex(({ id }) => id === activeLogId),
		[logs, activeLogId],
	);

	const selectedFields = convertKeysToColumnFields([
		...defaultLogsSelectedColumns,
		...options.selectColumns,
	]);

	const getItemContent = useCallback(
		(_: number, log: ILog): JSX.Element => {
			if (options.format === 'raw') {
				return (
					<RawLogView
						key={log.id}
						data={log}
						linesPerRow={options.maxLines}
						selectedFields={selectedFields}
						fontSize={options.fontSize}
					/>
				);
			}

			return (
				<ListLogView
					key={log.id}
					logData={log}
					selectedFields={selectedFields}
					linesPerRow={options.maxLines}
					onAddToQuery={onAddToQuery}
					onSetActiveLog={onSetActiveLog}
					fontSize={options.fontSize}
				/>
			);
		},
		[
			onAddToQuery,
			onSetActiveLog,
			options.fontSize,
			options.format,
			options.maxLines,
			selectedFields,
		],
	);

	useEffect(() => {
		if (!activeLogId || activeLogIndex < 0) return;

		ref?.current?.scrollToIndex({
			index: activeLogIndex,
			align: 'start',
			behavior: 'smooth',
		});
	}, [activeLogId, activeLogIndex]);

	const isLoadingList = isConnectionLoading && logs.length === 0;

	if (isLoadingList) {
		return <Spinner style={{ height: 'auto' }} tip="Fetching Logs" />;
	}

	return (
		<>
			{options.format !== OptionFormatTypes.TABLE && (
				<Heading>
					<Typography.Text>Event</Typography.Text>
				</Heading>
			)}

			{logs.length === 0 && <Typography>{t('fetching_log_lines')}</Typography>}

			{logs.length !== 0 && (
				<InfinityWrapperStyled>
					{options.format === OptionFormatTypes.TABLE ? (
						<InfinityTableView
							ref={ref}
							isLoading={false}
							tableViewProps={{
								logs,
								fields: selectedFields,
								linesPerRow: options.maxLines,
								fontSize: options.fontSize,
								appendTo: 'end',
								activeLogIndex,
							}}
						/>
					) : (
						<Card style={{ width: '100%' }} bodyStyle={CARD_BODY_STYLE}>
							<OverlayScrollbar isVirtuoso>
								<Virtuoso
									ref={ref}
									initialTopMostItemIndex={activeLogIndex !== -1 ? activeLogIndex : 0}
									data={logs}
									totalCount={logs.length}
									itemContent={getItemContent}
								/>
							</OverlayScrollbar>
						</Card>
					)}
				</InfinityWrapperStyled>
			)}
			<LogDetail
				selectedTab={VIEW_TYPES.OVERVIEW}
				log={activeLog}
				onClose={onClearActiveLog}
				onAddToQuery={onAddToQuery}
				onGroupByAttribute={onGroupByAttribute}
				onClickActionItem={onAddToQuery}
			/>
		</>
	);
}

export default memo(LiveLogsList);
