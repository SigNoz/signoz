/* eslint-disable no-nested-ternary */
import './entityLogs.styles.scss';

import { Card } from 'antd';
import RawLogView from 'components/Logs/RawLogView';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import { DEFAULT_ENTITY_VERSION } from 'constants/app';
import { K8sCategory } from 'container/InfraMonitoringK8s/constants';
import LogsError from 'container/LogsError/LogsError';
import { LogsLoading } from 'container/LogsLoading/LogsLoading';
import { FontSize } from 'container/OptionsMenu/types';
import { ORDERBY_FILTERS } from 'container/QueryBuilder/filters/OrderByFilter/config';
import { GetMetricQueryRange } from 'lib/dashboard/getQueryResults';
import { isEqual } from 'lodash-es';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { Virtuoso } from 'react-virtuoso';
import { ILog } from 'types/api/logs/log';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import {
	IBuilderQuery,
	TagFilterItem,
} from 'types/api/queryBuilder/queryBuilderData';
import { v4 } from 'uuid';

import {
	EntityDetailsEmptyContainer,
	getEntityEventsOrLogsQueryPayload,
} from '../utils';

interface Props {
	timeRange: {
		startTime: number;
		endTime: number;
	};
	handleChangeLogFilters: (filters: IBuilderQuery['filters']) => void;
	filters: IBuilderQuery['filters'];
	queryKey: string;
	category: K8sCategory;
	queryKeyFilters: Array<string>;
}

function EntityLogs({
	timeRange,
	handleChangeLogFilters,
	filters,
	queryKey,
	category,
	queryKeyFilters,
}: Props): JSX.Element {
	const [logs, setLogs] = useState<ILog[]>([]);
	const [hasReachedEndOfLogs, setHasReachedEndOfLogs] = useState(false);
	const [restFilters, setRestFilters] = useState<TagFilterItem[]>([]);
	const [resetLogsList, setResetLogsList] = useState<boolean>(false);

	useEffect(() => {
		const newRestFilters = filters.items.filter(
			(item) =>
				item.key?.key !== 'id' && !queryKeyFilters.includes(item.key?.key ?? ''),
		);

		const areFiltersSame = isEqual(restFilters, newRestFilters);

		if (!areFiltersSame) {
			setResetLogsList(true);
		}

		setRestFilters(newRestFilters);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filters]);

	const queryPayload = useMemo(() => {
		const basePayload = getEntityEventsOrLogsQueryPayload(
			timeRange.startTime,
			timeRange.endTime,
			filters,
		);

		basePayload.query.builder.queryData[0].pageSize = 100;
		basePayload.query.builder.queryData[0].orderBy = [
			{ columnName: 'timestamp', order: ORDERBY_FILTERS.DESC },
		];

		return basePayload;
	}, [timeRange.startTime, timeRange.endTime, filters]);

	const [isPaginating, setIsPaginating] = useState(false);

	const { data, isLoading, isFetching, isError } = useQuery({
		queryKey: [queryKey, timeRange.startTime, timeRange.endTime, filters],
		queryFn: () => GetMetricQueryRange(queryPayload, DEFAULT_ENTITY_VERSION),
		enabled: !!queryPayload,
		keepPreviousData: isPaginating,
	});

	useEffect(() => {
		if (data?.payload?.data?.newResult?.data?.result) {
			const currentData = data.payload.data.newResult.data.result;

			if (resetLogsList) {
				const currentLogs: ILog[] =
					currentData[0].list?.map((item) => ({
						...item.data,
						timestamp: item.timestamp,
					})) || [];

				setLogs(currentLogs);

				setResetLogsList(false);
			}

			if (currentData.length > 0 && currentData[0].list) {
				const currentLogs: ILog[] =
					currentData[0].list.map((item) => ({
						...item.data,
						timestamp: item.timestamp,
					})) || [];

				setLogs((prev) => [...prev, ...currentLogs]);
			} else {
				setHasReachedEndOfLogs(true);
			}
		}
	}, [data, restFilters, isPaginating, resetLogsList]);

	const getItemContent = useCallback(
		(_: number, logToRender: ILog): JSX.Element => (
			<RawLogView
				isReadOnly
				isTextOverflowEllipsisDisabled
				key={logToRender.id}
				data={logToRender}
				linesPerRow={5}
				fontSize={FontSize.MEDIUM}
				selectedFields={[
					{
						dataType: 'string',
						type: '',
						name: 'body',
					},
					{
						dataType: 'string',
						type: '',
						name: 'timestamp',
					},
				]}
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

	const renderFooter = useCallback(
		(): JSX.Element | null => (
			// eslint-disable-next-line react/jsx-no-useless-fragment
			<>
				{isFetching ? (
					<div className="logs-loading-skeleton"> Loading more logs ... </div>
				) : hasReachedEndOfLogs ? (
					<div className="logs-loading-skeleton"> *** End *** </div>
				) : null}
			</>
		),
		[isFetching, hasReachedEndOfLogs],
	);

	const renderContent = useMemo(
		() => (
			<Card bordered={false} className="entity-logs-list-card">
				<OverlayScrollbar isVirtuoso>
					<Virtuoso
						className="entity-logs-virtuoso"
						key="entity-logs-virtuoso"
						data={logs}
						endReached={loadMoreLogs}
						totalCount={logs.length}
						itemContent={getItemContent}
						overscan={200}
						components={{
							Footer: renderFooter,
						}}
					/>
				</OverlayScrollbar>
			</Card>
		),
		[logs, loadMoreLogs, getItemContent, renderFooter],
	);

	return (
		<div className="entity-logs">
			{isLoading && <LogsLoading />}
			{!isLoading && !isError && logs.length === 0 && (
				<EntityDetailsEmptyContainer category={category} view="logs" />
			)}
			{isError && !isLoading && <LogsError />}
			{!isLoading && !isError && logs.length > 0 && (
				<div className="entity-logs-list-container">{renderContent}</div>
			)}
		</div>
	);
}

export default EntityLogs;
