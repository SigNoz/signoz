import '../Explorer.styles.scss';

import { LoadingOutlined } from '@ant-design/icons';
import { Spin, Table, Typography } from 'antd';
import axios from 'api';
import logEvent from 'api/common/logEvent';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import cx from 'classnames';
import { initialQueriesMap } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import RightToolbarActions from 'container/QueryBuilder/components/ToolbarActions/RightToolbarActions';
import QueryBuilderSearchV2 from 'container/QueryBuilder/filters/QueryBuilderSearchV2/QueryBuilderSearchV2';
import Toolbar from 'container/Toolbar/Toolbar';
import { useGetCompositeQueryParam } from 'hooks/queryBuilder/useGetCompositeQueryParam';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryBuilderOperations';
import { useShareBuilderUrl } from 'hooks/queryBuilder/useShareBuilderUrl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';

import { DEFAULT_PARAMS, useApiMonitoringParams } from '../../queryParams';
import {
	columnsConfig,
	formatDataForTable,
	hardcodedAttributeKeys,
} from '../../utils';
import DomainDetails from './DomainDetails/DomainDetails';

function DomainList(): JSX.Element {
	const [params, setParams] = useApiMonitoringParams();
	const { showIP, selectedDomain } = params;
	const [selectedDomainIndex, setSelectedDomainIndex] = useState<number>(-1);
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const { currentQuery, handleRunQuery } = useQueryBuilder();
	const query = useMemo(() => currentQuery?.builder?.queryData[0] || null, [
		currentQuery,
	]);

	const { handleChangeQueryData } = useQueryOperations({
		index: 0,
		query,
		entityVersion: '',
	});

	// initialise tab with default query.
	useShareBuilderUrl({
		...initialQueriesMap.traces,
		builder: {
			...initialQueriesMap.traces.builder,
			queryData: [
				{
					...initialQueriesMap.traces.builder.queryData[0],
					dataSource: DataSource.TRACES,
					aggregateOperator: 'noop',
					aggregateAttribute: {
						...initialQueriesMap.traces.builder.queryData[0].aggregateAttribute,
					},
				},
			],
		},
	});

	const compositeData = useGetCompositeQueryParam();

	const handleChangeTagFilters = useCallback(
		(value: IBuilderQuery['filters']) => {
			handleChangeQueryData('filters', value);
		},
		[handleChangeQueryData],
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
				items: [
					{
						id: '212678b9',
						key: {
							key: 'kind_string',
							dataType: 'string',
							type: '',
							isColumn: true,
							isJSON: false,
						},
						op: '=',
						value: 'Client',
					},
					...(compositeData?.builder?.queryData[0]?.filters.items || []),
				],
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
		[REACT_QUERY_KEY.GET_DOMAINS_LIST, minTime, maxTime, compositeData, showIP],
		fetchApiOverview,
	);

	const formattedDataForTable = useMemo(
		() => formatDataForTable(data?.payload?.data?.result[0]?.table?.rows),
		[data],
	);

	// Open drawer if selectedDomain is set in URL
	useEffect(() => {
		if (selectedDomain && formattedDataForTable?.length > 0) {
			const idx = formattedDataForTable.findIndex(
				(item) => item.domainName === selectedDomain,
			);
			setSelectedDomainIndex(idx);
		}
	}, [selectedDomain, formattedDataForTable]);

	return (
		<section className={cx('api-module-right-section')}>
			<Toolbar
				showAutoRefresh={false}
				rightActions={<RightToolbarActions onStageRunQuery={handleRunQuery} />}
			/>
			{/* add bottom border here */}
			<div className={cx('api-monitoring-list-header')}>
				<QueryBuilderSearchV2
					query={query}
					onChange={handleChangeTagFilters}
					placeholder="Search filters..."
					hardcodedAttributeKeys={hardcodedAttributeKeys}
				/>
			</div>
			<Table
				className={cx('api-monitoring-domain-list-table')}
				dataSource={isFetching || isLoading ? [] : formattedDataForTable}
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
				onRow={(record, index): { onClick: () => void; className: string } => ({
					onClick: (): void => {
						if (index !== undefined) {
							const dataIndex = formattedDataForTable.findIndex(
								(item) => item.key === record.key,
							);
							setSelectedDomainIndex(dataIndex);
							setParams({ selectedDomain: record.domainName });
							logEvent('API Monitoring: Domain name row clicked', {});
						}
					},
					className: 'expanded-clickable-row',
				})}
				rowClassName={(_, index): string =>
					index % 2 === 0 ? 'table-row-dark' : 'table-row-light'
				}
			/>
			{selectedDomainIndex !== -1 && (
				<DomainDetails
					domainData={formattedDataForTable[selectedDomainIndex]}
					selectedDomainIndex={selectedDomainIndex}
					setSelectedDomainIndex={setSelectedDomainIndex}
					domainListLength={formattedDataForTable.length}
					handleClose={(): void => {
						setSelectedDomainIndex(-1);
						setParams(DEFAULT_PARAMS);
					}}
					domainListFilters={query?.filters}
				/>
			)}
		</section>
	);
}

export default DomainList;
