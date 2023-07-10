import { Card, Typography } from 'antd';
// components
import ListLogView from 'components/Logs/ListLogView';
import RawLogView from 'components/Logs/RawLogView';
import Spinner from 'components/Spinner';
import { LOCALSTORAGE } from 'constants/localStorage';
import ExplorerControlPanel from 'container/ExplorerControlPanel';
import { Heading } from 'container/LogsTable/styles';
import { useOptionsMenu } from 'container/OptionsMenu';
import { contentStyle } from 'container/Trace/Search/config';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import useFontFaceObserver from 'hooks/useFontObserver';
import { memo, useCallback, useMemo } from 'react';
import { Virtuoso } from 'react-virtuoso';
// interfaces
import { ILog } from 'types/api/logs/log';
import { DataSource, StringOperators } from 'types/common/queryBuilder';

import InfinityTableView from './InfinityTableView';
import { LogsExplorerListProps } from './LogsExplorerList.interfaces';
import { InfinityWrapperStyled } from './styles';
import { convertKeysToColumnFields } from './utils';

function Footer(): JSX.Element {
	return <Spinner height={20} tip="Getting Logs" />;
}

function LogsExplorerList({
	isLoading,
	currentStagedQueryData,
	logs,
	onOpenDetailedView,
	onEndReached,
	onExpand,
}: LogsExplorerListProps): JSX.Element {
	const { initialDataSource } = useQueryBuilder();

	const { options, config } = useOptionsMenu({
		storageKey: LOCALSTORAGE.LOGS_LIST_OPTIONS,
		dataSource: initialDataSource || DataSource.METRICS,
		aggregateOperator:
			currentStagedQueryData?.aggregateOperator || StringOperators.NOOP,
	});

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
					<RawLogView
						key={log.id}
						data={log}
						linesPerRow={options.maxLines}
						onClickExpand={onExpand}
					/>
				);
			}

			return (
				<ListLogView
					key={log.id}
					logData={log}
					selectedFields={selectedFields}
					onOpenDetailedView={onOpenDetailedView}
				/>
			);
		},
		[
			options.format,
			options.maxLines,
			selectedFields,
			onOpenDetailedView,
			onExpand,
		],
	);

	const renderContent = useMemo(() => {
		const components = isLoading
			? {
					Footer,
			  }
			: {};

		if (options.format === 'table') {
			return (
				<InfinityTableView
					tableViewProps={{
						logs,
						fields: selectedFields,
						linesPerRow: options.maxLines,
						onClickExpand: onExpand,
						appendTo: 'end',
					}}
					infitiyTableProps={{ onEndReached }}
				/>
			);
		}

		return (
			<Card style={{ width: '100%' }} bodyStyle={{ ...contentStyle }}>
				<Virtuoso
					useWindowScroll
					data={logs}
					endReached={onEndReached}
					totalCount={logs.length}
					itemContent={getItemContent}
					components={components}
				/>
			</Card>
		);
	}, [
		isLoading,
		logs,
		options.format,
		options.maxLines,
		onEndReached,
		getItemContent,
		selectedFields,
		onExpand,
	]);

	return (
		<>
			<ExplorerControlPanel
				isLoading={isLoading}
				isShowPageSize={false}
				optionsMenuConfig={config}
			/>
			{options.format !== 'table' && (
				<Heading>
					<Typography.Text>Event</Typography.Text>
				</Heading>
			)}
			{logs.length === 0 && <Typography>No logs lines found</Typography>}
			<InfinityWrapperStyled>{renderContent}</InfinityWrapperStyled>
		</>
	);
}

export default memo(LogsExplorerList);
