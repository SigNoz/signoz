import './HostMetricLogs.styles.scss';

import { Card, Skeleton } from 'antd';
import RawLogView from 'components/Logs/RawLogView';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import Spinner from 'components/Spinner';
import { DEFAULT_ENTITY_VERSION } from 'constants/app';
import { CARD_BODY_STYLE } from 'constants/card';
import { InfinityWrapperStyled } from 'container/LogsExplorerList/styles';
import { FontSize } from 'container/OptionsMenu/types';
import { ORDERBY_FILTERS } from 'container/QueryBuilder/filters/OrderByFilter/config';
import useDebounce from 'hooks/useDebounce';
import { GetMetricQueryRange } from 'lib/dashboard/getQueryResults';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { Virtuoso } from 'react-virtuoso';
import { ILog } from 'types/api/logs/log';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

import { getHostLogsQueryPayload } from './constants';

interface Props {
	timeRange: {
		startTime: number;
		endTime: number;
	};
	filters: IBuilderQuery['filters'];
}

function Footer(): JSX.Element {
	return <Spinner height={20} tip="Getting Logs" />;
}

function HostMetricsLogs({ timeRange, filters }: Props): JSX.Element {
	const [logs, setLogs] = useState<ILog[]>([]);
	const [offset, setOffset] = useState<number>(0);
	const debouncedFilters = useDebounce(filters, 800);

	const queryPayload = useMemo(() => {
		const basePayload = getHostLogsQueryPayload(
			timeRange.startTime,
			timeRange.endTime,
			debouncedFilters,
		);

		basePayload.query.builder.queryData[0].offset = offset;
		basePayload.query.builder.queryData[0].pageSize = 50;
		basePayload.query.builder.queryData[0].orderBy = [
			{ columnName: 'timestamp', order: ORDERBY_FILTERS.DESC },
		];

		return basePayload;
	}, [timeRange.startTime, timeRange.endTime, debouncedFilters, offset]);

	const { data, isLoading } = useQuery({
		queryKey: [
			'hostMetricsLogs',
			offset,
			debouncedFilters,
			timeRange.startTime,
			timeRange.endTime,
		],
		queryFn: () => GetMetricQueryRange(queryPayload, DEFAULT_ENTITY_VERSION),
		enabled: !!queryPayload,
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

	const loadMore = useCallback(() => {
		if (!isLoading) {
			setOffset((prev) => prev + 50);
		}
	}, [isLoading]);

	const renderContent = useMemo(() => {
		const components = isLoading ? { Footer } : {};

		return (
			<Card
				style={{ width: '98%', marginTop: '12px' }}
				bodyStyle={CARD_BODY_STYLE}
				bordered={false}
			>
				<OverlayScrollbar isVirtuoso>
					<Virtuoso
						key="host-metrics-logs-virtuoso"
						data={logs}
						endReached={loadMore}
						totalCount={logs.length}
						itemContent={getItemContent}
						components={components}
						overscan={200}
					/>
				</OverlayScrollbar>
			</Card>
		);
	}, [isLoading, logs, loadMore, getItemContent]);

	return (
		<div className="host-metrics-logs">
			{isLoading && logs.length === 0 ? (
				<Skeleton active />
			) : (
				<InfinityWrapperStyled>{renderContent}</InfinityWrapperStyled>
			)}
		</div>
	);
}

export default HostMetricsLogs;
