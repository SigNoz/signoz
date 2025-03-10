/* eslint-disable no-restricted-syntax */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import '../InfraMonitoringK8s.styles.scss';
import './K8sDeploymentsList.styles.scss';

import { LoadingOutlined } from '@ant-design/icons';
import {
	Button,
	Spin,
	Table,
	TablePaginationConfig,
	TableProps,
	Typography,
} from 'antd';
import { ColumnType, SorterResult } from 'antd/es/table/interface';
import logEvent from 'api/common/logEvent';
import { K8sDeploymentsListPayload } from 'api/infraMonitoring/getK8sDeploymentsList';
import classNames from 'classnames';
import { useGetK8sDeploymentsList } from 'hooks/infraMonitoring/useGetK8sDeploymentsList';
import { useGetAggregateKeys } from 'hooks/queryBuilder/useGetAggregateKeys';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryBuilderOperations';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { GlobalReducer } from 'types/reducer/globalTime';

import {
	K8sCategory,
	K8sEntityToAggregateAttributeMapping,
} from '../constants';
import K8sHeader from '../K8sHeader';
import LoadingContainer from '../LoadingContainer';
import { usePageSize } from '../utils';
import DeploymentDetails from './DeploymentDetails';
import {
	defaultAddedColumns,
	formatDataForTable,
	getK8sDeploymentsListColumns,
	getK8sDeploymentsListQuery,
	K8sDeploymentsRowData,
} from './utils';

// eslint-disable-next-line sonarjs/cognitive-complexity
function K8sDeploymentsList({
	isFiltersVisible,
	handleFilterVisibilityChange,
	quickFiltersLastUpdated,
}: {
	isFiltersVisible: boolean;
	handleFilterVisibilityChange: () => void;
	quickFiltersLastUpdated: number;
}): JSX.Element {
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const [currentPage, setCurrentPage] = useState(1);

	const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);

	const [orderBy, setOrderBy] = useState<{
		columnName: string;
		order: 'asc' | 'desc';
	} | null>(null);

	const [selectedDeploymentUID, setselectedDeploymentUID] = useState<
		string | null
	>(null);

	const { pageSize, setPageSize } = usePageSize(K8sCategory.DEPLOYMENTS);

	const [groupBy, setGroupBy] = useState<IBuilderQuery['groupBy']>([]);

	const [
		selectedRowData,
		setSelectedRowData,
	] = useState<K8sDeploymentsRowData | null>(null);

	const [groupByOptions, setGroupByOptions] = useState<
		{ value: string; label: string }[]
	>([]);

	const { currentQuery } = useQueryBuilder();

	const queryFilters = useMemo(
		() =>
			currentQuery?.builder?.queryData[0]?.filters || {
				items: [],
				op: 'and',
			},
		[currentQuery?.builder?.queryData],
	);

	// Reset pagination every time quick filters are changed
	useEffect(() => {
		setCurrentPage(1);
	}, [quickFiltersLastUpdated]);

	const createFiltersForSelectedRowData = (
		selectedRowData: K8sDeploymentsRowData,
		groupBy: IBuilderQuery['groupBy'],
	): IBuilderQuery['filters'] => {
		const baseFilters: IBuilderQuery['filters'] = {
			items: [...queryFilters.items],
			op: 'and',
		};

		if (!selectedRowData) return baseFilters;

		const { groupedByMeta } = selectedRowData;

		for (const key of groupBy) {
			baseFilters.items.push({
				key: {
					key: key.key,
					type: null,
				},
				op: '=',
				value: groupedByMeta[key.key],
				id: key.key,
			});
		}

		return baseFilters;
	};

	const fetchGroupedByRowDataQuery = useMemo(() => {
		if (!selectedRowData) return null;

		const baseQuery = getK8sDeploymentsListQuery();

		const filters = createFiltersForSelectedRowData(selectedRowData, groupBy);

		return {
			...baseQuery,
			limit: 10,
			offset: 0,
			filters,
			start: Math.floor(minTime / 1000000),
			end: Math.floor(maxTime / 1000000),
			orderBy,
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [minTime, maxTime, orderBy, selectedRowData, groupBy]);

	const {
		data: groupedByRowData,
		isFetching: isFetchingGroupedByRowData,
		isLoading: isLoadingGroupedByRowData,
		isError: isErrorGroupedByRowData,
		refetch: fetchGroupedByRowData,
	} = useGetK8sDeploymentsList(
		fetchGroupedByRowDataQuery as K8sDeploymentsListPayload,
		{
			queryKey: ['deploymentList', fetchGroupedByRowDataQuery],
			enabled: !!fetchGroupedByRowDataQuery && !!selectedRowData,
		},
	);

	const {
		data: groupByFiltersData,
		isLoading: isLoadingGroupByFilters,
	} = useGetAggregateKeys(
		{
			dataSource: currentQuery.builder.queryData[0].dataSource,
			aggregateAttribute:
				K8sEntityToAggregateAttributeMapping[K8sCategory.DEPLOYMENTS],
			aggregateOperator: 'noop',
			searchText: '',
			tagType: '',
		},
		{
			queryKey: [currentQuery.builder.queryData[0].dataSource, 'noop'],
		},
		true,
		K8sCategory.NODES,
	);

	const query = useMemo(() => {
		const baseQuery = getK8sDeploymentsListQuery();
		const queryPayload = {
			...baseQuery,
			limit: pageSize,
			offset: (currentPage - 1) * pageSize,
			filters: queryFilters,
			start: Math.floor(minTime / 1000000),
			end: Math.floor(maxTime / 1000000),
			orderBy,
		};
		if (groupBy.length > 0) {
			queryPayload.groupBy = groupBy;
		}
		return queryPayload;
	}, [pageSize, currentPage, queryFilters, minTime, maxTime, orderBy, groupBy]);

	const formattedGroupedByDeploymentsData = useMemo(
		() =>
			formatDataForTable(groupedByRowData?.payload?.data?.records || [], groupBy),
		[groupedByRowData, groupBy],
	);

	const { data, isFetching, isLoading, isError } = useGetK8sDeploymentsList(
		query as K8sDeploymentsListPayload,
		{
			queryKey: ['deploymentList', query],
			enabled: !!query,
		},
	);

	const deploymentsData = useMemo(() => data?.payload?.data?.records || [], [
		data,
	]);
	const totalCount = data?.payload?.data?.total || 0;

	const formattedDeploymentsData = useMemo(
		() => formatDataForTable(deploymentsData, groupBy),
		[deploymentsData, groupBy],
	);

	const nestedDeploymentsData = useMemo(() => {
		if (!selectedRowData || !groupedByRowData?.payload?.data.records) return [];
		return groupedByRowData?.payload?.data?.records || [];
	}, [groupedByRowData, selectedRowData]);

	const columns = useMemo(() => getK8sDeploymentsListColumns(groupBy), [
		groupBy,
	]);

	const handleGroupByRowClick = (record: K8sDeploymentsRowData): void => {
		setSelectedRowData(record);

		if (expandedRowKeys.includes(record.key)) {
			setExpandedRowKeys(expandedRowKeys.filter((key) => key !== record.key));
		} else {
			setExpandedRowKeys([record.key]);
		}
	};

	useEffect(() => {
		if (selectedRowData) {
			fetchGroupedByRowData();
		}
	}, [selectedRowData, fetchGroupedByRowData]);

	const numberOfPages = useMemo(() => Math.ceil(totalCount / pageSize), [
		totalCount,
		pageSize,
	]);

	const handleTableChange: TableProps<K8sDeploymentsRowData>['onChange'] = useCallback(
		(
			pagination: TablePaginationConfig,
			_filters: Record<string, (string | number | boolean)[] | null>,
			sorter:
				| SorterResult<K8sDeploymentsRowData>
				| SorterResult<K8sDeploymentsRowData>[],
		): void => {
			if (pagination.current) {
				setCurrentPage(pagination.current);
				logEvent('Infra Monitoring: K8s deployments list page number changed', {
					page: pagination.current,
					pageSize,
					numberOfPages,
				});
			}

			if ('field' in sorter && sorter.order) {
				setOrderBy({
					columnName: sorter.field as string,
					order: sorter.order === 'ascend' ? 'asc' : 'desc',
				});
			} else {
				setOrderBy(null);
			}
		},
		[numberOfPages, pageSize],
	);

	const { handleChangeQueryData } = useQueryOperations({
		index: 0,
		query: currentQuery.builder.queryData[0],
		entityVersion: '',
	});

	const handleFiltersChange = useCallback(
		(value: IBuilderQuery['filters']): void => {
			handleChangeQueryData('filters', value);
			setCurrentPage(1);

			logEvent('Infra Monitoring: K8s deployments list filters applied', {});
		},
		[handleChangeQueryData],
	);

	useEffect(() => {
		logEvent('Infra Monitoring: K8s deployments list page visited', {});
	}, []);

	const selectedDeploymentData = useMemo(() => {
		if (!selectedDeploymentUID) return null;
		if (groupBy.length > 0) {
			// If grouped by, return the deployment from the formatted grouped by deployments data
			return (
				nestedDeploymentsData.find(
					(deployment) => deployment.deploymentName === selectedDeploymentUID,
				) || null
			);
		}
		// If not grouped by, return the deployment from the deployments data
		return (
			deploymentsData.find(
				(deployment) => deployment.deploymentName === selectedDeploymentUID,
			) || null
		);
	}, [
		selectedDeploymentUID,
		groupBy.length,
		deploymentsData,
		nestedDeploymentsData,
	]);

	const handleRowClick = (record: K8sDeploymentsRowData): void => {
		if (groupBy.length === 0) {
			setSelectedRowData(null);
			setselectedDeploymentUID(record.deploymentUID);
		} else {
			handleGroupByRowClick(record);
		}

		logEvent('Infra Monitoring: K8s deployment list item clicked', {
			deploymentUID: record.deploymentName,
		});
	};

	const nestedColumns = useMemo(() => getK8sDeploymentsListColumns([]), []);

	const isGroupedByAttribute = groupBy.length > 0;

	const handleExpandedRowViewAllClick = (): void => {
		if (!selectedRowData) return;

		const filters = createFiltersForSelectedRowData(selectedRowData, groupBy);

		handleFiltersChange(filters);

		setCurrentPage(1);
		setSelectedRowData(null);
		setGroupBy([]);
		setOrderBy(null);
	};

	const expandedRowRender = (): JSX.Element => (
		<div className="expanded-table-container">
			{isErrorGroupedByRowData && (
				<Typography>{groupedByRowData?.error || 'Something went wrong'}</Typography>
			)}
			{isFetchingGroupedByRowData || isLoadingGroupedByRowData ? (
				<LoadingContainer />
			) : (
				<div className="expanded-table">
					<Table
						columns={nestedColumns as ColumnType<K8sDeploymentsRowData>[]}
						dataSource={formattedGroupedByDeploymentsData}
						pagination={false}
						scroll={{ x: true }}
						tableLayout="fixed"
						size="small"
						loading={{
							spinning: isFetchingGroupedByRowData || isLoadingGroupedByRowData,
							indicator: <Spin indicator={<LoadingOutlined size={14} spin />} />,
						}}
						showHeader={false}
						onRow={(record): { onClick: () => void; className: string } => ({
							onClick: (): void => setselectedDeploymentUID(record.deploymentUID),
							className: 'expanded-clickable-row',
						})}
					/>

					{groupedByRowData?.payload?.data?.total &&
					groupedByRowData?.payload?.data?.total > 10 ? (
						<div className="expanded-table-footer">
							<Button
								type="default"
								size="small"
								className="periscope-btn secondary"
								onClick={handleExpandedRowViewAllClick}
							>
								View All
							</Button>
						</div>
					) : null}
				</div>
			)}
		</div>
	);

	const expandRowIconRenderer = ({
		expanded,
		onExpand,
		record,
	}: {
		expanded: boolean;
		onExpand: (
			record: K8sDeploymentsRowData,
			e: React.MouseEvent<HTMLButtonElement>,
		) => void;
		record: K8sDeploymentsRowData;
	}): JSX.Element | null => {
		if (!isGroupedByAttribute) {
			return null;
		}

		return expanded ? (
			<Button
				className="periscope-btn ghost"
				onClick={(e: React.MouseEvent<HTMLButtonElement>): void =>
					onExpand(record, e)
				}
				role="button"
			>
				<ChevronDown size={14} />
			</Button>
		) : (
			<Button
				className="periscope-btn ghost"
				onClick={(e: React.MouseEvent<HTMLButtonElement>): void =>
					onExpand(record, e)
				}
				role="button"
			>
				<ChevronRight size={14} />
			</Button>
		);
	};

	const handleCloseDeploymentDetail = (): void => {
		setselectedDeploymentUID(null);
	};

	const handleGroupByChange = useCallback(
		(value: IBuilderQuery['groupBy']) => {
			const groupBy = [];

			for (let index = 0; index < value.length; index++) {
				const element = (value[index] as unknown) as string;

				const key = groupByFiltersData?.payload?.attributeKeys?.find(
					(key) => key.key === element,
				);

				if (key) {
					groupBy.push(key);
				}
			}

			// Reset pagination on switching to groupBy
			setCurrentPage(1);
			setGroupBy(groupBy);
			setExpandedRowKeys([]);

			logEvent('Infra Monitoring: K8s deployments list group by changed', {});
		},
		[groupByFiltersData],
	);

	useEffect(() => {
		if (groupByFiltersData?.payload) {
			setGroupByOptions(
				groupByFiltersData?.payload?.attributeKeys?.map((filter) => ({
					value: filter.key,
					label: filter.key,
				})) || [],
			);
		}
	}, [groupByFiltersData]);

	const onPaginationChange = (page: number, pageSize: number): void => {
		setCurrentPage(page);
		setPageSize(pageSize);
		logEvent('Infra Monitoring: K8s deployments list page number changed', {
			page,
			pageSize,
			numberOfPages,
		});
	};

	return (
		<div className="k8s-list">
			<K8sHeader
				isFiltersVisible={isFiltersVisible}
				handleFilterVisibilityChange={handleFilterVisibilityChange}
				defaultAddedColumns={defaultAddedColumns}
				handleFiltersChange={handleFiltersChange}
				groupByOptions={groupByOptions}
				isLoadingGroupByFilters={isLoadingGroupByFilters}
				handleGroupByChange={handleGroupByChange}
				selectedGroupBy={groupBy}
				entity={K8sCategory.NODES}
			/>
			{isError && <Typography>{data?.error || 'Something went wrong'}</Typography>}

			<Table
				className={classNames('k8s-list-table', 'deployments-list-table', {
					'expanded-deployments-list-table': isGroupedByAttribute,
				})}
				dataSource={isFetching || isLoading ? [] : formattedDeploymentsData}
				columns={columns}
				pagination={{
					current: currentPage,
					pageSize,
					total: totalCount,
					showSizeChanger: true,
					hideOnSinglePage: false,
					onChange: onPaginationChange,
				}}
				scroll={{ x: true }}
				loading={{
					spinning: isFetching || isLoading,
					indicator: <Spin indicator={<LoadingOutlined size={14} spin />} />,
				}}
				locale={{
					emptyText:
						isFetching || isLoading ? null : (
							<div className="no-filtered-hosts-message-container">
								<div className="no-filtered-hosts-message-content">
									<img
										src="/Icons/emptyState.svg"
										alt="thinking-emoji"
										className="empty-state-svg"
									/>

									<Typography.Text className="no-filtered-hosts-message">
										This query had no results. Edit your query and try again!
									</Typography.Text>
								</div>
							</div>
						),
				}}
				tableLayout="fixed"
				onChange={handleTableChange}
				onRow={(record): { onClick: () => void; className: string } => ({
					onClick: (): void => handleRowClick(record),
					className: 'clickable-row',
				})}
				expandable={{
					expandedRowRender: isGroupedByAttribute ? expandedRowRender : undefined,
					expandIcon: expandRowIconRenderer,
					expandedRowKeys,
				}}
			/>

			<DeploymentDetails
				deployment={selectedDeploymentData}
				isModalTimeSelection
				onClose={handleCloseDeploymentDetail}
			/>
		</div>
	);
}

export default K8sDeploymentsList;
