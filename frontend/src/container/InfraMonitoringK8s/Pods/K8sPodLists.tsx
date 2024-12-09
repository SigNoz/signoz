import '../InfraMonitoringK8s.styles.scss';

import { LoadingOutlined } from '@ant-design/icons';
import {
	Skeleton,
	Spin,
	Table,
	TablePaginationConfig,
	TableProps,
	Typography,
} from 'antd';
import { SorterResult } from 'antd/es/table/interface';
import logEvent from 'api/common/logEvent';
import { K8sPodsListPayload } from 'api/infraMonitoring/getK8sPodsList';
import { useGetK8sPodsList } from 'hooks/infraMonitoring/useGetK8sPodsList';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { GlobalReducer } from 'types/reducer/globalTime';
import {
	getFromLocalStorage,
	updateLocalStorage,
} from 'utils/localStorageReadWrite';

import K8sHeader from '../K8sHeader';
import {
	defaultAddedColumns,
	defaultAvailableColumns,
	formatDataForTable,
	getK8sPodsListColumns,
	getK8sPodsListQuery,
	IPodColumn,
	K8sPodsRowData,
} from '../utils';
import PodDetails from './PodDetails/PodDetails';

// eslint-disable-next-line sonarjs/cognitive-complexity
function K8sPodsList(): JSX.Element {
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const [currentPage, setCurrentPage] = useState(1);

	const [addedColumns, setAddedColumns] = useState<IPodColumn[]>([]);

	const [availableColumns, setAvailableColumns] = useState<IPodColumn[]>(
		defaultAvailableColumns,
	);

	const [filters, setFilters] = useState<IBuilderQuery['filters']>({
		items: [],
		op: 'and',
	});

	useEffect(() => {
		const addedColumns = getFromLocalStorage('k8sPodsAddedColumns');

		if (addedColumns && addedColumns.length > 0) {
			const availableColumns = defaultAvailableColumns.filter(
				(column) => !addedColumns.includes(column.id),
			);

			const newAddedColumns = defaultAvailableColumns.filter((column) =>
				addedColumns.includes(column.id),
			);

			setAvailableColumns(availableColumns);
			setAddedColumns(newAddedColumns);
		}
	}, []);

	const [orderBy, setOrderBy] = useState<{
		columnName: string;
		order: 'asc' | 'desc';
	} | null>(null);

	const [selectedPodUID, setSelectedPodUID] = useState<string | null>(null);

	const pageSize = 10;

	const query = useMemo(() => {
		const baseQuery = getK8sPodsListQuery();
		return {
			...baseQuery,
			limit: pageSize,
			offset: (currentPage - 1) * pageSize,
			filters,
			start: Math.floor(minTime / 1000000),
			end: Math.floor(maxTime / 1000000),
			orderBy,
		};
	}, [currentPage, filters, minTime, maxTime, orderBy]);

	const { data, isFetching, isLoading, isError } = useGetK8sPodsList(
		query as K8sPodsListPayload,
		{
			queryKey: ['hostList', query],
			enabled: !!query,
		},
	);

	const podsData = useMemo(() => data?.payload?.data?.records || [], [data]);
	const totalCount = data?.payload?.data?.total || 0;

	const formattedPodsData = useMemo(() => formatDataForTable(podsData), [
		podsData,
	]);

	const columns = useMemo(() => getK8sPodsListColumns(addedColumns), [
		addedColumns,
	]);

	const handleTableChange: TableProps<K8sPodsRowData>['onChange'] = useCallback(
		(
			pagination: TablePaginationConfig,
			_filters: Record<string, (string | number | boolean)[] | null>,
			sorter: SorterResult<K8sPodsRowData> | SorterResult<K8sPodsRowData>[],
		): void => {
			if (pagination.current) {
				setCurrentPage(pagination.current);
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
		[],
	);

	const handleFiltersChange = useCallback(
		(value: IBuilderQuery['filters']): void => {
			const isNewFilterAdded = value.items.length !== filters.items.length;
			if (isNewFilterAdded) {
				setFilters(value);
				setCurrentPage(1);

				logEvent('Infra Monitoring: K8s list filters applied', {
					filters: value,
				});
			}
		},
		[filters],
	);

	useEffect(() => {
		logEvent('Infra Monitoring: K8s list page visited', {});
	}, []);

	const selectedPodData = useMemo(() => {
		if (!selectedPodUID) return null;
		return podsData.find((pod) => pod.podUID === selectedPodUID) || null;
	}, [selectedPodUID, podsData]);

	const handleRowClick = (record: K8sPodsRowData): void => {
		setSelectedPodUID(record.podUID);

		logEvent('Infra Monitoring: K8s list item clicked', {
			podUID: record.podUID,
		});
	};

	const handleClosePodDetail = (): void => {
		setSelectedPodUID(null);
	};

	const showPodsTable =
		!isError &&
		!isLoading &&
		!isFetching &&
		!(formattedPodsData.length === 0 && filters.items.length > 0);

	const showNoFilteredPodsMessage =
		!isFetching &&
		!isLoading &&
		formattedPodsData.length === 0 &&
		filters.items.length > 0;

	const handleAddColumn = useCallback(
		(column: IPodColumn): void => {
			setAddedColumns((prev) => [...prev, column]);

			setAvailableColumns((prev) => prev.filter((c) => c.value !== column.value));
		},
		[setAddedColumns, setAvailableColumns],
	);

	// Update local storage when added columns updated
	useEffect(() => {
		const addedColumnIDs = addedColumns.map((column) => column.id);

		updateLocalStorage('k8sPodsAddedColumns', addedColumnIDs);
	}, [addedColumns]);

	const handleRemoveColumn = useCallback(
		(column: IPodColumn): void => {
			setAddedColumns((prev) => prev.filter((c) => c.value !== column.value));

			setAvailableColumns((prev) => [...prev, column]);
		},
		[setAddedColumns, setAvailableColumns],
	);

	return (
		<div className="k8s-list">
			<K8sHeader
				defaultAddedColumns={defaultAddedColumns}
				addedColumns={addedColumns}
				availableColumns={availableColumns}
				handleFiltersChange={handleFiltersChange}
				onAddColumn={handleAddColumn}
				onRemoveColumn={handleRemoveColumn}
			/>
			{isError && <Typography>{data?.error || 'Something went wrong'}</Typography>}

			{showNoFilteredPodsMessage && (
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
			)}

			{(isFetching || isLoading) && (
				<div className="k8s-list-loading-state">
					<Skeleton.Input
						className="k8s-list-loading-state-item"
						size="large"
						block
						active
					/>
					<Skeleton.Input
						className="k8s-list-loading-state-item"
						size="large"
						block
						active
					/>
					<Skeleton.Input
						className="k8s-list-loading-state-item"
						size="large"
						block
						active
					/>
				</div>
			)}

			{showPodsTable && (
				<Table
					className="k8s-list-table"
					dataSource={isFetching || isLoading ? [] : formattedPodsData}
					columns={columns}
					pagination={{
						current: currentPage,
						pageSize,
						total: totalCount,
						showSizeChanger: false,
						hideOnSinglePage: true,
					}}
					scroll={{ x: true }}
					loading={{
						spinning: isFetching || isLoading,
						indicator: <Spin indicator={<LoadingOutlined size={14} spin />} />,
					}}
					tableLayout="fixed"
					rowKey={(record): string => record.podUID}
					onChange={handleTableChange}
					onRow={(record): { onClick: () => void; className: string } => ({
						onClick: (): void => handleRowClick(record),
						className: 'clickable-row',
					})}
				/>
			)}

			<PodDetails
				pod={selectedPodData}
				isModalTimeSelection
				onClose={handleClosePodDetail}
			/>
		</div>
	);
}

export default K8sPodsList;
