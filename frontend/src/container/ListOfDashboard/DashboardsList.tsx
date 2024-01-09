import { PlusOutlined } from '@ant-design/icons';
import { Card, Col, Dropdown, Input, Row, TableColumnProps } from 'antd';
import { ItemType } from 'antd/es/menu/hooks/useItems';
import createDashboard from 'api/dashboard/create';
import { AxiosError } from 'axios';
import {
	DynamicColumnsKey,
	TableDataSource,
} from 'components/ResizeTable/contants';
import DynamicColumnTable from 'components/ResizeTable/DynamicColumnTable';
import LabelColumn from 'components/TableRenderer/LabelColumn';
import TextToolTip from 'components/TextToolTip';
import ROUTES from 'constants/routes';
import { useGetAllDashboard } from 'hooks/dashboard/useGetAllDashboard';
import useComponentPermission from 'hooks/useComponentPermission';
import useDebouncedFn from 'hooks/useDebouncedFunction';
import history from 'lib/history';
import { Key, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { generatePath } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { Dashboard } from 'types/api/dashboard/getAll';
import AppReducer from 'types/reducer/app';

import DateComponent from '../../components/ResizeTable/TableComponent/DateComponent';
import useSortableTable from '../../hooks/ResizeTable/useSortableTable';
import useUrlQuery from '../../hooks/useUrlQuery';
import { GettableAlert } from '../../types/api/alerts/get';
import ImportJSON from './ImportJSON';
import { ButtonContainer, NewDashboardButton, TableContainer } from './styles';
import DeleteButton from './TableComponents/DeleteButton';
import Name from './TableComponents/Name';
import { filterDashboard } from './utils';

const { Search } = Input;

function DashboardsList(): JSX.Element {
	const {
		data: dashboardListResponse = [],
		isLoading: isDashboardListLoading,
		refetch: refetchDashboardList,
	} = useGetAllDashboard();

	const { role } = useSelector<AppState, AppReducer>((state) => state.app);

	const [action, createNewDashboard] = useComponentPermission(
		['action', 'create_new_dashboards'],
		role,
	);

	const { t } = useTranslation('dashboard');

	const [
		isImportJSONModalVisible,
		setIsImportJSONModalVisible,
	] = useState<boolean>(false);

	const [uploadedGrafana, setUploadedGrafana] = useState<boolean>(false);
	const [isFilteringDashboards, setIsFilteringDashboards] = useState(false);

	const params = useUrlQuery();
	const orderColumnParam = params.get('columnKey');
	const orderQueryParam = params.get('order');
	const paginationParam = params.get('page');
	const searchParams = params.get('search');
	const [searchString, setSearchString] = useState<string>(searchParams || '');

	const [dashboards, setDashboards] = useState<Dashboard[]>();

	const sortingOrder: 'ascend' | 'descend' | null =
		orderQueryParam === 'ascend' || orderQueryParam === 'descend'
			? orderQueryParam
			: null;

	const { sortedInfo, handleChange } = useSortableTable<GettableAlert>(
		sortingOrder,
		orderColumnParam || '',
		searchString,
	);

	const sortDashboardsByCreatedAt = (dashboards: Dashboard[]): void => {
		const sortedDashboards = dashboards.sort(
			(a, b) =>
				new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
		);
		setDashboards(sortedDashboards);
	};

	useEffect(() => {
		sortDashboardsByCreatedAt(dashboardListResponse);
		const filteredDashboards = filterDashboard(
			searchString,
			dashboardListResponse,
		);
		setDashboards(filteredDashboards || []);
	}, [dashboardListResponse, searchString]);

	const [newDashboardState, setNewDashboardState] = useState({
		loading: false,
		error: false,
		errorMessage: '',
	});

	const dynamicColumns: TableColumnProps<Data>[] = [
		{
			title: 'Created At',
			dataIndex: 'createdAt',
			width: 30,
			key: DynamicColumnsKey.CreatedAt,
			sorter: (a: Data, b: Data): number => {
				console.log({ a });
				const prev = new Date(a.createdAt).getTime();
				const next = new Date(b.createdAt).getTime();

				return prev - next;
			},
			render: DateComponent,
			sortOrder:
				sortedInfo.columnKey === DynamicColumnsKey.CreatedAt
					? sortedInfo.order
					: null,
		},
		{
			title: 'Created By',
			dataIndex: 'createdBy',
			width: 30,
			key: DynamicColumnsKey.CreatedBy,
		},
		{
			title: 'Last Updated Time',
			width: 30,
			dataIndex: 'lastUpdatedTime',
			key: DynamicColumnsKey.UpdatedAt,
			sorter: (a: Data, b: Data): number => {
				const prev = new Date(a.lastUpdatedTime).getTime();
				const next = new Date(b.lastUpdatedTime).getTime();

				return prev - next;
			},
			render: DateComponent,
			sortOrder:
				sortedInfo.columnKey === DynamicColumnsKey.UpdatedAt
					? sortedInfo.order
					: null,
		},
		{
			title: 'Last Updated By',
			dataIndex: 'lastUpdatedBy',
			width: 30,
			key: DynamicColumnsKey.UpdatedBy,
		},
	];

	const columns = useMemo(() => {
		const tableColumns: TableColumnProps<Data>[] = [
			{
				title: 'Name',
				dataIndex: 'name',
				width: 40,
				render: Name,
			},
			{
				title: 'Description',
				width: 50,
				dataIndex: 'description',
			},
			{
				title: 'Tags',
				dataIndex: 'tags',
				width: 50,
				render: (value): JSX.Element => <LabelColumn labels={value} />,
			},
		];

		if (action) {
			tableColumns.push({
				title: 'Action',
				dataIndex: '',
				width: 40,
				render: DeleteButton,
			});
		}

		return tableColumns;
	}, [action]);

	const data: Data[] =
		dashboards?.map((e) => ({
			createdAt: e.created_at,
			description: e.data.description || '',
			id: e.uuid,
			lastUpdatedTime: e.updated_at,
			name: e.data.title,
			tags: e.data.tags || [],
			key: e.uuid,
			createdBy: e.created_by,
			isLocked: !!e.isLocked || false,
			lastUpdatedBy: e.updated_by,
			refetchDashboardList,
		})) || [];

	const onNewDashboardHandler = useCallback(async () => {
		try {
			setNewDashboardState({
				...newDashboardState,
				loading: true,
			});
			const response = await createDashboard({
				title: t('new_dashboard_title', {
					ns: 'dashboard',
				}),
				uploadedGrafana: false,
			});

			if (response.statusCode === 200) {
				history.push(
					generatePath(ROUTES.DASHBOARD, {
						dashboardId: response.payload.uuid,
					}),
				);
			} else {
				setNewDashboardState({
					...newDashboardState,
					loading: false,
					error: true,
					errorMessage: response.error || 'Something went wrong',
				});
			}
		} catch (error) {
			setNewDashboardState({
				...newDashboardState,
				error: true,
				errorMessage: (error as AxiosError).toString() || 'Something went Wrong',
			});
		}
	}, [newDashboardState, t]);

	const getText = useCallback(() => {
		if (!newDashboardState.error && !newDashboardState.loading) {
			return 'New Dashboard';
		}

		if (newDashboardState.loading) {
			return 'Loading';
		}

		return newDashboardState.errorMessage;
	}, [
		newDashboardState.error,
		newDashboardState.errorMessage,
		newDashboardState.loading,
	]);

	const onModalHandler = (uploadedGrafana: boolean): void => {
		setIsImportJSONModalVisible((state) => !state);
		setUploadedGrafana(uploadedGrafana);
	};

	const getMenuItems = useMemo(() => {
		const menuItems: ItemType[] = [
			{
				key: t('import_json').toString(),
				label: t('import_json'),
				onClick: (): void => onModalHandler(false),
			},
			{
				key: t('import_grafana_json').toString(),
				label: t('import_grafana_json'),
				onClick: (): void => onModalHandler(true),
				disabled: true,
			},
		];

		if (createNewDashboard) {
			menuItems.unshift({
				key: t('create_dashboard').toString(),
				label: t('create_dashboard'),
				disabled: isDashboardListLoading,
				onClick: onNewDashboardHandler,
			});
		}

		return menuItems;
	}, [createNewDashboard, isDashboardListLoading, onNewDashboardHandler, t]);

	const handleSearch = useDebouncedFn((event: unknown): void => {
		setIsFilteringDashboards(true);
		const searchText = (event as React.BaseSyntheticEvent)?.target?.value || '';
		const filteredDashboards = filterDashboard(searchText, dashboardListResponse);
		setDashboards(filteredDashboards);
		setIsFilteringDashboards(false);
		setSearchString(searchText);
	}, 500);

	const GetHeader = useMemo(
		() => (
			<Row gutter={16} align="middle">
				<Col span={18}>
					<Search
						disabled={isDashboardListLoading}
						placeholder="Search by Name, Description, Tags"
						onChange={handleSearch}
						loading={isFilteringDashboards}
						style={{ marginBottom: 16, marginTop: 16 }}
						defaultValue={searchString}
					/>
				</Col>

				<Col
					span={6}
					style={{
						display: 'flex',
						justifyContent: 'flex-end',
					}}
				>
					<ButtonContainer>
						<TextToolTip
							{...{
								text: `More details on how to create dashboards`,
								url: 'https://signoz.io/docs/userguide/dashboards',
							}}
						/>
					</ButtonContainer>

					<Dropdown
						menu={{ items: getMenuItems }}
						disabled={isDashboardListLoading}
						placement="bottomRight"
					>
						<NewDashboardButton
							icon={<PlusOutlined />}
							type="primary"
							data-testid="create-new-dashboard"
							loading={newDashboardState.loading}
							danger={newDashboardState.error}
						>
							{getText()}
						</NewDashboardButton>
					</Dropdown>
				</Col>
			</Row>
		),
		[
			isDashboardListLoading,
			handleSearch,
			isFilteringDashboards,
			getMenuItems,
			newDashboardState.loading,
			newDashboardState.error,
			getText,
			searchString,
		],
	);

	return (
		<Card style={{ margin: '16px 0' }}>
			{GetHeader}

			<TableContainer>
				<ImportJSON
					isImportJSONModalVisible={isImportJSONModalVisible}
					uploadedGrafana={uploadedGrafana}
					onModalHandler={(): void => onModalHandler(false)}
				/>
				<DynamicColumnTable
					tablesource={TableDataSource.Dashboard}
					dynamicColumns={dynamicColumns}
					columns={columns}
					pagination={{
						pageSize: 10,
						defaultPageSize: 10,
						total: data?.length || 0,
						defaultCurrent: Number(paginationParam) || 1,
					}}
					showHeader
					bordered
					sticky
					loading={isDashboardListLoading}
					dataSource={data}
					onChange={handleChange}
					showSorterTooltip
				/>
			</TableContainer>
		</Card>
	);
}

export interface Data {
	key: Key;
	name: string;
	description: string;
	tags: string[];
	createdBy: string;
	createdAt: string;
	lastUpdatedTime: string;
	lastUpdatedBy: string;
	isLocked: boolean;
	id: string;
}

export default DashboardsList;
