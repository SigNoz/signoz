import './Explorer.styles.scss';

import { FilterOutlined, LoadingOutlined } from '@ant-design/icons';
import * as Sentry from '@sentry/react';
import { Spin, Switch, Table, Typography } from 'antd';
import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import cx from 'classnames';
import QuickFilters from 'components/QuickFilters/QuickFilters';
import { QuickFiltersSource } from 'components/QuickFilters/types';
import QueryBuilderSearchV2 from 'container/QueryBuilder/filters/QueryBuilderSearchV2/QueryBuilderSearchV2';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryBuilderOperations';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
import { useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';

import {
	ApiMonitoringQuickFiltersConfig,
	columnsConfig,
	formatDataForTable,
	hardcodedAttributeKeys,
} from '../utils';

function Explorer(): JSX.Element {
	const [showIP, setShowIP] = useState<boolean>(true);

	const { currentQuery } = useQueryBuilder();

	const { handleChangeQueryData } = useQueryOperations({
		index: 0,
		query: currentQuery.builder.queryData[0],
		entityVersion: '',
	});

	const updatedCurrentQuery = useMemo(
		() => ({
			...currentQuery,
			builder: {
				...currentQuery.builder,
				queryData: [
					{
						...currentQuery.builder.queryData[0],
						dataSource: DataSource.TRACES,
						aggregateOperator: 'noop',
						aggregateAttribute: {
							...currentQuery.builder.queryData[0].aggregateAttribute,
						},
					},
				],
			},
		}),
		[currentQuery],
	);
	const query = updatedCurrentQuery?.builder?.queryData[0] || null;
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	const fetchApiOverview = async (): Promise<
		SuccessResponse<any> | ErrorResponse
	> => {
		const requestBody = {
			start: minTime,
			end: maxTime,
			show_ip: showIP,
			filters: {
				op: 'AND',
				items: query.filters.items,
			},
		};

		try {
			const response = await axios.post(
				'/third-party-apis/overview/list',
				requestBody,
			);
			return {
				statusCode: 200,
				error: null,
				message: response.data.status,
				payload: response.data,
			};
		} catch (error) {
			return ErrorResponseHandler(error as AxiosError);
		}
	};

	const { data, isLoading, isFetching } = useQuery(
		['apiOverview', minTime, maxTime, currentQuery, showIP],
		fetchApiOverview,
	);

	const domainListData = useMemo(
		() => data?.payload?.data?.result[0]?.table?.rows,
		[data],
	);

	return (
		<Sentry.ErrorBoundary fallback={<ErrorBoundaryFallback />}>
			<div className={cx('api-monitoring-page', 'filter-visible')}>
				<section className={cx('api-quick-filter-left-section')}>
					<div className={cx('api-quick-filters-header')}>
						<FilterOutlined />
						<Typography.Text>Filters</Typography.Text>
					</div>

					<div className={cx('api-quick-filters-header')}>
						<Typography.Text>Show IP addresses</Typography.Text>
						<Switch
							size="small"
							style={{ marginLeft: 'auto' }}
							checked={showIP}
							onClick={(): void => {
								setShowIP((showIP) => !showIP);
							}}
						/>
					</div>

					<QuickFilters
						source={QuickFiltersSource.API_MONITORING}
						config={ApiMonitoringQuickFiltersConfig}
						handleFilterVisibilityChange={(): void => {}}
						onFilterChange={(query: Query): void =>
							handleChangeQueryData('filters', query.builder.queryData[0].filters)
						}
					/>
				</section>
				<section className={cx('api-module-right-section')}>
					<div className={cx('api-monitoring-list-header')}>
						<QueryBuilderSearchV2
							query={query}
							onChange={(searchFilters): void =>
								handleChangeQueryData('filters', searchFilters)
							}
							placeholder="Search filters..."
							hardcodedAttributeKeys={hardcodedAttributeKeys}
						/>
						<DateTimeSelectionV2
							showAutoRefresh={false}
							showRefreshText={false}
							hideShareModal
						/>
					</div>
					<Table
						className={cx('api-monitoring-domain-list-table')}
						dataSource={
							isFetching || isLoading ? [] : formatDataForTable(domainListData)
						}
						columns={columnsConfig}
						loading={{
							spinning: isFetching || isLoading,
							indicator: <Spin indicator={<LoadingOutlined size={14} spin />} />,
						}}
						locale={{
							emptyText:
								isFetching || isLoading ? null : (
									<div className="no-filtered-domains-message-container">
										<div className="no-filtered-domains-message-content">
											<img
												src="/Icons/emptyState.svg"
												alt="thinking-emoji"
												className="empty-state-svg"
											/>

											<Typography.Text className="no-filtered-domains-message">
												This query had no results. Edit your query and try again!
											</Typography.Text>
										</div>
									</div>
								),
						}}
						scroll={{ x: true }}
						tableLayout="fixed"
					/>
				</section>
			</div>
		</Sentry.ErrorBoundary>
	);
}

export default Explorer;
