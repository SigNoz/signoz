import '../Explorer.styles.scss';

import { LoadingOutlined } from '@ant-design/icons';
import { Spin, Table, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import cx from 'classnames';
import QuerySearch from 'components/QueryBuilderV2/QueryV2/QuerySearch/QuerySearch';
import { initialQueriesMap } from 'constants/queryBuilder';
import RightToolbarActions from 'container/QueryBuilder/components/ToolbarActions/RightToolbarActions';
import Toolbar from 'container/Toolbar/Toolbar';
import { useGetCompositeQueryParam } from 'hooks/queryBuilder/useGetCompositeQueryParam';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryBuilderOperations';
import { useShareBuilderUrl } from 'hooks/queryBuilder/useShareBuilderUrl';
import { useListOverview } from 'hooks/thirdPartyApis/useListOverview';
import { get } from 'lodash-es';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { HandleChangeQueryDataV5 } from 'types/common/operations.types';
import { DataSource } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';

import { ApiMonitoringHardcodedAttributeKeys } from '../../constants';
import { DEFAULT_PARAMS, useApiMonitoringParams } from '../../queryParams';
import { columnsConfig, formatDataForTable } from '../../utils';
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

	const compositeData = useGetCompositeQueryParam();

	const { data, isLoading, isFetching } = useListOverview({
		start: minTime,
		end: maxTime,
		show_ip: Boolean(showIP),
		filter: {
			expression: `kind_string = 'Client' ${get(
				compositeData,
				'builder.queryData[0].filter.expression',
				'',
			)}`,
		},
	});

	// initialise tab with default query.
	useShareBuilderUrl({
		defaultValue: {
			...initialQueriesMap.traces,
			builder: {
				...initialQueriesMap.traces.builder,
				queryData: [
					{
						...initialQueriesMap.traces.builder.queryData[0],
						dataSource: DataSource.TRACES,
						aggregateOperator: 'noop',
						aggregateAttribute: {
							...(initialQueriesMap.traces.builder.queryData[0]
								.aggregateAttribute as BaseAutocompleteData),
						},
					},
				],
			},
		},
	});

	const handleSearchChange = useCallback(
		(value: string) => {
			(handleChangeQueryData as HandleChangeQueryDataV5)('filter', {
				expression: value,
			});
		},
		[handleChangeQueryData],
	);

	const formattedDataForTable = useMemo(
		() =>
			formatDataForTable(
				data?.data?.data?.data.results[0]?.data || [],
				data?.data?.data?.data.results[0]?.columns || [],
			),
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
			<div className={cx('api-monitoring-list-header')}>
				<QuerySearch
					dataSource={DataSource.TRACES}
					queryData={query}
					onChange={handleSearchChange}
					placeholder="Enter your filter query (e.g., deployment.environment = 'otel-demo' AND service.name = 'frontend')"
					hardcodedAttributeKeys={ApiMonitoringHardcodedAttributeKeys}
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
