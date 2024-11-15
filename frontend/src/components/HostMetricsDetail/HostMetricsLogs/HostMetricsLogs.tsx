import './HostMetricLogs.styles.scss';

import { Card } from 'antd';
import RawLogView from 'components/Logs/RawLogView';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import { DEFAULT_ENTITY_VERSION } from 'constants/app';
import { CARD_BODY_STYLE } from 'constants/card';
import LogsError from 'container/LogsError/LogsError';
import { InfinityWrapperStyled } from 'container/LogsExplorerList/styles';
import { LogsLoading } from 'container/LogsLoading/LogsLoading';
import NoLogs from 'container/NoLogs/NoLogs';
import { FontSize } from 'container/OptionsMenu/types';
import { ORDERBY_FILTERS } from 'container/QueryBuilder/filters/OrderByFilter/config';
import { GetMetricQueryRange } from 'lib/dashboard/getQueryResults';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { Virtuoso } from 'react-virtuoso';
import { ILog } from 'types/api/logs/log';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import { v4 } from 'uuid';

import { getHostLogsQueryPayload } from './constants';

interface Props {
	timeRange: {
		startTime: number;
		endTime: number;
	};
	handleChangeLogFilters: (filters: IBuilderQuery['filters']) => void;
	filters: IBuilderQuery['filters'];
}

function HostMetricsLogs({
	timeRange,
	handleChangeLogFilters,
	filters,
}: Props): JSX.Element {
	const [logs, setLogs] = useState<ILog[]>([]);

	const queryPayload = useMemo(() => {
		const basePayload = getHostLogsQueryPayload(
			timeRange.startTime,
			timeRange.endTime,
			filters,
		);

		basePayload.query.builder.queryData[0].pageSize = 50;
		basePayload.query.builder.queryData[0].orderBy = [
			{ columnName: 'timestamp', order: ORDERBY_FILTERS.DESC },
		];

		return basePayload;
	}, [timeRange.startTime, timeRange.endTime, filters]);

	const [isPaginating, setIsPaginating] = useState(false);

	const { data, isLoading, isError } = useQuery({
		queryKey: [
			'hostMetricsLogs',
			timeRange.startTime,
			timeRange.endTime,
			filters,
		],
		queryFn: () => GetMetricQueryRange(queryPayload, DEFAULT_ENTITY_VERSION),
		enabled: !!queryPayload,
		keepPreviousData: isPaginating,
	});

	useEffect(() => {
		if (data?.payload?.data?.newResult?.data?.result) {
			const currentData = data.payload.data.newResult.data.result;
			if (currentData.length > 0 && currentData[0].list) {
				const currentLogs: ILog[] = currentData[0].list.map((item) => ({
					...item.data,
					timestamp: item.timestamp,
				}));
				setLogs((prev) => [...prev, ...currentLogs]);
			}
		}
	}, [data]);

	const getItemContent = useCallback(
		(_: number, logToRender: ILog): JSX.Element => (
			<RawLogView
				isReadOnly
				isTextOverflowEllipsisDisabled
				key={logToRender.id}
				data={logToRender}
				linesPerRow={1}
				fontSize={FontSize.MEDIUM}
			/>
		),
		[],
	);

	const loadMoreLogs = useCallback(() => {
		if (!logs.length) return;

		setIsPaginating(true);
		const lastLog = logs[logs.length - 1];

		const newItems = [
			...filters.items.filter((item) => item.key?.key !== 'id'),
			{
				id: v4(),
				key: {
					key: 'id',
					type: '',
					dataType: DataTypes.String,
					isColumn: true,
				},
				op: '<',
				value: lastLog.id,
			},
		];

		const newFilters = {
			op: 'AND',
			items: newItems,
		} as IBuilderQuery['filters'];

		handleChangeLogFilters(newFilters);
	}, [logs, filters, handleChangeLogFilters]);

	useEffect(() => {
		setIsPaginating(false);
	}, [data]);

	const renderContent = useMemo(
		() => (
			<Card
				style={{ width: '98%', marginTop: '12px' }}
				bodyStyle={CARD_BODY_STYLE}
				bordered={false}
			>
				<OverlayScrollbar isVirtuoso>
					<Virtuoso
						key="host-metrics-logs-virtuoso"
						data={logs}
						endReached={loadMoreLogs}
						totalCount={logs.length}
						itemContent={getItemContent}
						overscan={200}
					/>
				</OverlayScrollbar>
			</Card>
		),
		[logs, loadMoreLogs, getItemContent],
	);

	return (
		<div className="host-metrics-logs">
			{isLoading && <LogsLoading />}
			{!isLoading && !isError && logs.length === 0 && (
				<NoLogs dataSource={DataSource.LOGS} />
			)}
			{isError && !isLoading && <LogsError />}
			{!isLoading && !isError && (
				<InfinityWrapperStyled>{renderContent}</InfinityWrapperStyled>
			)}
		</div>
	);
}

export default HostMetricsLogs;
