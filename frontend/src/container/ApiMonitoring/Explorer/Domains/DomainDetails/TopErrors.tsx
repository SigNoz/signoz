import { useMemo, useState } from 'react';
import { QueryFunctionContext, useQuery } from 'react-query';
import { Spin, Table, Tooltip } from 'antd';
import { Info, Loader } from '@signozhq/icons';
import { Switch } from '@signozhq/ui/switch';
import { Typography } from '@signozhq/ui/typography';
import { getQueryRangeV5 } from 'api/v5/queryRange/getQueryRange';
import { MetricRangePayloadV5, ScalarData } from 'api/v5/v5';
import { useNavigateToExplorer } from 'components/CeleryTask/useNavigateToExplorer';
import { combineInitialAndUserExpression } from 'components/QueryBuilderV2/QueryV2/QuerySearch/utils';
import { withErrorBoundary } from 'components/ErrorBoundaryHOC';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import {
	formatTopErrorsDataForTable,
	getHttpUrlExpression,
	getTopErrorsColumnsConfig,
	getTopErrorsCoRelationQueryFilters,
	getTopErrorsQueryPayload,
} from 'container/ApiMonitoring/utils';
import { SuccessResponseV2 } from 'types/api';
import { DataSource } from 'types/common/queryBuilder';

import emptyStateUrl from '@/assets/Icons/emptyState.svg';

import EndPointPicker from './components/EndPointPicker';
import ErrorState from './components/ErrorState';

function TopErrors({
	domainName,
	timeRange,
	initialFilterExpression,
}: {
	domainName: string;
	timeRange: {
		startTime: number;
		endTime: number;
	};
	initialFilterExpression: string;
}): JSX.Element {
	const { startTime: minTime, endTime: maxTime } = timeRange;

	const [endPointName, setSelectedEndPointName] = useState<string>('');
	const [showStatusCodeErrors, setShowStatusCodeErrors] =
		useState<boolean>(true);

	const queryPayload = useMemo(
		() =>
			getTopErrorsQueryPayload(
				domainName,
				minTime,
				maxTime,
				combineInitialAndUserExpression(
					getHttpUrlExpression(endPointName),
					initialFilterExpression,
				),
				showStatusCodeErrors,
			),
		[
			domainName,
			endPointName,
			minTime,
			maxTime,
			initialFilterExpression,
			showStatusCodeErrors,
		],
	);

	const {
		data: topErrorsData,
		isLoading,
		isRefetching,
		isError,
		refetch,
	} = useQuery({
		queryKey: [
			REACT_QUERY_KEY.GET_TOP_ERRORS_BY_DOMAIN,
			queryPayload,
			ENTITY_VERSION_V5,
			showStatusCodeErrors,
		],
		queryFn: ({
			signal,
		}: QueryFunctionContext): Promise<SuccessResponseV2<MetricRangePayloadV5>> =>
			getQueryRangeV5(queryPayload, ENTITY_VERSION_V5, signal),
		enabled: !!queryPayload,
		staleTime: 0,
		cacheTime: 0,
	});

	const topErrorsColumnsConfig = useMemo(() => getTopErrorsColumnsConfig(), []);

	const formattedTopErrorsData = useMemo(
		() =>
			formatTopErrorsDataForTable(
				topErrorsData?.data?.data?.data?.results[0] as ScalarData,
			),
		[topErrorsData],
	);

	const navigateToExplorer = useNavigateToExplorer();

	if (isError) {
		return (
			<div className="all-endpoints-error-state-wrapper">
				<ErrorState refetch={refetch} />
			</div>
		);
	}

	return (
		<div className="all-endpoints-container">
			<div className="top-errors-dropdown-container">
				<EndPointPicker
					domainName={domainName}
					timeRange={timeRange}
					filterExpression=""
					value={endPointName}
					onChange={setSelectedEndPointName}
				/>
				<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
					<Switch
						color="primary"
						textPlacement="right"
						value={showStatusCodeErrors}
						onChange={setShowStatusCodeErrors}
						testId="top-errors-status-message-toggle"
					/>
					<span style={{ color: 'white', fontSize: '14px' }}>
						Status Message Exists
					</span>
					<Tooltip title="When enabled, shows errors that have a status message. When disabled, shows all errors regardless of status message">
						<Info size={16} color="white" />
					</Tooltip>
				</div>
			</div>

			<div className="endpoints-table-container" data-testid="top-errors-table">
				<div className="endpoints-table-header">
					{showStatusCodeErrors ? 'Errors with Status Message' : 'All Errors'}{' '}
					<Tooltip
						title={
							showStatusCodeErrors
								? 'Shows errors that have a status message'
								: 'Shows all errors regardless of status message'
						}
					>
						<Info size={16} color="white" />
					</Tooltip>
				</div>
				<Table
					columns={topErrorsColumnsConfig}
					loading={{
						spinning: isLoading || isRefetching,
						indicator: (
							<Spin indicator={<Loader size={14} className="animate-spin" />} />
						),
					}}
					dataSource={isLoading || isRefetching ? [] : formattedTopErrorsData}
					locale={{
						emptyText:
							isLoading || isRefetching ? null : (
								<div className="no-filtered-endpoints-message-container">
									<div className="no-filtered-endpoints-message-content">
										<img
											src={emptyStateUrl}
											alt="thinking-emoji"
											className="empty-state-svg"
										/>

										<div className="no-filtered-endpoints-message">
											<Typography
												variant="paragraph"
												size="base"
												weight="regular"
												color="inherit"
												as="p"
												textOverflow="wrap"
											>
												{showStatusCodeErrors
													? 'Please disable "Status Message Exists" toggle to see all errors'
													: 'This query had no results. Edit your query and try again!'}
											</Typography>
										</div>
									</div>
								</div>
							),
					}}
					scroll={{ x: true }}
					tableLayout="fixed"
					rowClassName={(_, index): string =>
						index % 2 === 0 ? 'table-row-dark' : 'table-row-light'
					}
					onRow={(record): { onClick: () => void } => ({
						onClick: (): void => {
							const filters = getTopErrorsCoRelationQueryFilters(
								domainName,
								record.endpointName,
								record.statusCode,
							);
							navigateToExplorer({
								filters: [...(filters?.items || [])],
								dataSource: DataSource.TRACES,
								startTime: minTime,
								endTime: maxTime,
								shouldResolveQuery: true,
							});
						},
					})}
				/>
			</div>
		</div>
	);
}

export default withErrorBoundary(TopErrors);
