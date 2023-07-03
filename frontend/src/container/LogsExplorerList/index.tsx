import { Card, Typography } from 'antd';
// components
import ListLogView from 'components/Logs/ListLogView';
import RawLogView from 'components/Logs/RawLogView';
import Spinner from 'components/Spinner';
import ExplorerControlPanel from 'container/ExplorerControlPanel';
import { Container, Heading } from 'container/LogsTable/styles';
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

function Footer(): JSX.Element {
	return <Spinner height={20} tip="Getting Logs" />;
}

function LogsExplorerList({
	isLoading,
	currentStagedQueryData,
	logs,
	isLimit,
	onEndReached,
}: LogsExplorerListProps): JSX.Element {
	const { initialDataSource } = useQueryBuilder();

	const { options, config } = useOptionsMenu({
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

	const getItemContent = useCallback(
		(_: number, log: ILog): JSX.Element => {
			if (options.format === 'raw') {
				return (
					<RawLogView
						key={log.id}
						data={log}
						linesPerRow={options.maxLines}
						// TODO: write new onClickExpanded logic
						onClickExpand={(): void => {}}
					/>
				);
			}

			return <ListLogView key={log.id} logData={log} />;
		},
		[options],
	);

	const renderContent = useMemo(() => {
		const components = isLimit
			? {}
			: {
					Footer,
			  };

		if (options.format === 'table') {
			return (
				<InfinityTableView
					tableViewProps={{
						logs,
						fields: options.selectColumns.map((item) => ({
							dataType: item.dataType as string,
							name: item.key,
							type: item.type as string,
						})),
						linesPerRow: options.maxLines,
						onClickExpand: (): void => {},
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
		isLimit,
		options.format,
		options.selectColumns,
		options.maxLines,
		logs,
		onEndReached,
		getItemContent,
	]);

	return (
		<Container>
			<ExplorerControlPanel
				isLoading={isLoading}
				isShowPageSize
				optionsMenuConfig={config}
			/>
			{options.format !== 'table' && (
				<Heading>
					<Typography.Text>Event</Typography.Text>
				</Heading>
			)}
			{logs.length === 0 && <Typography>No logs lines found</Typography>}
			<InfinityWrapperStyled>{renderContent}</InfinityWrapperStyled>
		</Container>
	);
}

export default memo(LogsExplorerList);
