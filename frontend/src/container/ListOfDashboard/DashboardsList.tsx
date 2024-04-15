/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
import './DashboardList.styles.scss';

import { PlusOutlined } from '@ant-design/icons';
import { Color } from '@signozhq/design-tokens';
import {
	Button,
	Col,
	ColorPicker,
	Dropdown,
	Input,
	MenuProps,
	Modal,
	Row,
	Table,
	TableColumnProps,
	Tag,
	Typography,
} from 'antd';
import { ItemType } from 'antd/es/menu/hooks/useItems';
import { TableProps } from 'antd/lib';
import createDashboard from 'api/dashboard/create';
import GrafanaIcon from 'assets/CustomIcons/GrafanaIcon';
import JuiceBoxIcon from 'assets/CustomIcons/JuiceBoxIcon';
import TentIcon from 'assets/CustomIcons/TentIcon';
import { AxiosError } from 'axios';
import { dashboardListMessage } from 'components/facingIssueBtn/util';
import {
	DynamicColumnsKey,
	TableDataSource,
} from 'components/ResizeTable/contants';
import DynamicColumnTable from 'components/ResizeTable/DynamicColumnTable';
import LabelColumn from 'components/TableRenderer/LabelColumn';
import TextToolTip from 'components/TextToolTip';
import { ENTITY_VERSION_V4 } from 'constants/app';
import ROUTES from 'constants/routes';
import { useGetAllDashboard } from 'hooks/dashboard/useGetAllDashboard';
import useComponentPermission from 'hooks/useComponentPermission';
import useDebouncedFn from 'hooks/useDebouncedFunction';
import getRandomColor from 'lib/getRandomColor';
import history from 'lib/history';
import {
	CalendarClock,
	CalendarClockIcon,
	Check,
	Compass,
	FolderPen,
	LayoutGrid,
	PencilRuler,
	PenLine,
	Plus,
	Radius,
	Search,
	SortDesc,
	TentTree,
	Trash2,
	X,
} from 'lucide-react';
import {
	ChangeEvent,
	Key,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { generatePath } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { Dashboard } from 'types/api/dashboard/getAll';
import { ViewProps } from 'types/api/saveViews/types';
import AppReducer from 'types/reducer/app';
import { USER_ROLES } from 'types/roles';

import DateComponent from '../../components/ResizeTable/TableComponent/DateComponent';
import useSortableTable from '../../hooks/ResizeTable/useSortableTable';
import useUrlQuery from '../../hooks/useUrlQuery';
import { GettableAlert } from '../../types/api/alerts/get';
import ImportJSON from './ImportJSON';
import { ButtonContainer, NewDashboardButton, TableContainer } from './styles';
import DeleteButton from './TableComponents/DeleteButton';
import Name from './TableComponents/Name';
import { filterDashboard } from './utils';

// const { Search } = Input;

const allowedRoles = [USER_ROLES.ADMIN, USER_ROLES.AUTHOR, USER_ROLES.EDITOR];

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

	const [searchValue, setSearchValue] = useState<string>('');

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
				version: ENTITY_VERSION_V4,
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

	const handleSearch = (event: ChangeEvent<HTMLInputElement>): void => {
		setIsFilteringDashboards(true);
		setSearchValue(event.target.value);
		const searchText = (event as React.BaseSyntheticEvent)?.target?.value || '';
		const filteredDashboards = filterDashboard(searchText, dashboardListResponse);
		setDashboards(filteredDashboards);
		setIsFilteringDashboards(false);
		setSearchString(searchText);
	};

	// const columns = useMemo(() => {
	// 	const tableColumns: TableColumnProps<Data>[] = [
	// 		{
	// 			title: 'Name',
	// 			dataIndex: 'name',
	// 			width: 40,
	// 			render: Name,
	// 		},
	// 		{
	// 			title: 'Description',
	// 			width: 50,
	// 			dataIndex: 'description',
	// 		},
	// 		{
	// 			title: 'Tags',
	// 			dataIndex: 'tags',
	// 			width: 50,
	// 			render: (value): JSX.Element => <LabelColumn labels={value} />,
	// 		},
	// 	];

	// 	if (action) {
	// 		tableColumns.push({
	// 			title: 'Action',
	// 			dataIndex: '',
	// 			width: 40,
	// 			render: DeleteButton,
	// 		});
	// 	}

	// 	return tableColumns;
	// }, [action]);

	const columns: TableProps<Data>['columns'] = [
		{
			title: 'Dashboards',
			key: 'dashboard',
			render: (dashboard: Data): JSX.Element => {
				const timeOptions: Intl.DateTimeFormatOptions = {
					hour: '2-digit',
					minute: '2-digit',
					second: '2-digit',
					hour12: false,
				};
				const formattedTime = new Date(dashboard.createdAt).toLocaleTimeString(
					'en-US',
					timeOptions,
				);

				const dateOptions: Intl.DateTimeFormatOptions = {
					month: 'short',
					day: 'numeric',
					year: 'numeric',
				};

				const formattedDate = new Date(dashboard.createdAt).toLocaleDateString(
					'en-US',
					dateOptions,
				);

				// Combine time and date
				const formattedDateAndTime = `${formattedDate} ⎯ ${formattedTime}`;

				const isEditDeleteSupported = allowedRoles.includes(role as string);

				const getLink = (): string => `${ROUTES.ALL_DASHBOARD}/${dashboard.id}`;

				const onClickHandler = (event: React.MouseEvent<HTMLElement>): void => {
					if (event.metaKey || event.ctrlKey) {
						window.open(getLink(), '_blank');
					} else {
						history.push(getLink());
					}
				};

				return (
					<div className="dashboard-list-item" onClick={onClickHandler}>
						<div className="title-with-action">
							<div className="dashboard-title">
								<TentIcon /> <Typography.Text>{dashboard.name}</Typography.Text>
							</div>
							{/* 
							<div className="action-btn">
								<PenLine
									size={14}
									className={isEditDeleteSupported ? '' : 'hidden'}
									onClick={(): void => handleEditModelOpen(view, bgColor)}
								/>
								<Compass size={14} onClick={(): void => handleRedirectQuery(view)} />
								<Trash2
									size={14}
									className={isEditDeleteSupported ? '' : 'hidden'}
									color={Color.BG_CHERRY_500}
									onClick={(): void => handleDeleteMode
										lOpen(view.uuid, view.name)}
								/>
							</div> */}

							{dashboard?.tags && dashboard.tags.length > 0 && (
								<div className="dashboard-tags">
									{dashboard.tags.map((tag) => (
										<Tag color="orange" key={tag}>
											{tag}
										</Tag>
									))}
								</div>
							)}
						</div>
						<div className="dashboard-details">
							<div className="dashboard-created-at">
								<CalendarClock size={14} />
								<Typography.Text>{formattedDateAndTime}</Typography.Text>
							</div>

							{dashboard.createdBy && (
								<>
									<div className="dashboard-tag">
										<Typography.Text className="tag-text">
											{dashboard.createdBy?.substring(0, 1).toUpperCase()}
										</Typography.Text>
									</div>
									<Typography.Text className="dashboard-created-by">
										{dashboard.createdBy}
									</Typography.Text>
								</>
							)}
						</div>
					</div>
				);
			},
		},
	];
	// const GetHeader = useMemo(
	// 	() => (
	// 		<Row gutter={16} align="middle">
	// 			<Col span={18}>
	// 				<Search
	// 					disabled={isDashboardListLoading}
	// 					placeholder="Search by Name, Description, Tags"
	// 					onChange={handleSearch}
	// 					loading={isFilteringDashboards}
	// 					style={{ marginBottom: 16, marginTop: 16 }}
	// 					defaultValue={searchString}
	// 					autoFocus
	// 				/>
	// 			</Col>

	// 			{createNewDashboard && (
	// 				<Col
	// 					span={6}
	// 					style={{
	// 						display: 'flex',
	// 						justifyContent: 'flex-end',
	// 					}}
	// 				>
	// 					<ButtonContainer>
	// 						<TextToolTip
	// 							{...{
	// 								text: `More details on how to create dashboards`,
	// 								url: 'https://signoz.io/docs/userguide/dashboards',
	// 							}}
	// 						/>
	// 					</ButtonContainer>

	// 					<Dropdown
	// 						menu={{ items: getMenuItems }}
	// 						disabled={isDashboardListLoading}
	// 						placement="bottomRight"
	// 					>
	// 						<NewDashboardButton
	// 							icon={<PlusOutlined />}
	// 							type="primary"
	// 							data-testid="create-new-dashboard"
	// 							loading={newDashboardState.loading}
	// 							danger={newDashboardState.error}
	// 						>
	// 							{getText()}
	// 						</NewDashboardButton>
	// 					</Dropdown>
	// 				</Col>
	// 			)}
	// 		</Row>
	// 	),
	// 	[
	// 		isDashboardListLoading,
	// 		handleSearch,
	// 		isFilteringDashboards,
	// 		searchString,
	// 		createNewDashboard,
	// 		getMenuItems,
	// 		newDashboardState.loading,
	// 		newDashboardState.error,
	// 		getText,
	// 	],
	// );

	const sortMenuItems: MenuProps['items'] = [
		{
			label: (
				<div className="create-dashboard-menu-item">
					{' '}
					<PencilRuler size={14} /> Last created
				</div>
			),
			key: '0',
		},
		{
			label: (
				<div className="create-dashboard-menu-item">
					{' '}
					<CalendarClockIcon size={14} /> Last updated
				</div>
			),
			key: '1',
		},
		{
			label: (
				<div className="create-dashboard-menu-item">
					{' '}
					<FolderPen size={14} /> Name
				</div>
			),
			key: '3',
		},
	];

	const createDashboardItems: MenuProps['items'] = [
		{
			label: (
				<div className="create-dashboard-menu-item">
					{' '}
					<LayoutGrid size={14} /> Create dashboard{' '}
				</div>
			),
			key: '0',
		},
		{
			label: (
				<div className="create-dashboard-menu-item">
					{' '}
					<Radius size={14} /> Import JSON{' '}
				</div>
			),
			key: '1',
		},
		{
			label: (
				<div className="create-dashboard-menu-item">
					{' '}
					<GrafanaIcon /> Use Grafana JSON{' '}
				</div>
			),
			key: '3',
		},
	];

	return (
		<div className="dashboards-list-container">
			<div className="dashboards-list-view-content">
				<div className="dashboards-list-title-container">
					<Typography.Title className="title">Dashboards</Typography.Title>
					<Typography.Text className="subtitle">
						Create and manage dashboards for your workspace.
					</Typography.Text>
				</div>

				<div className="dashboards-list-header-container">
					<Dropdown
						overlayClassName="new-dashboard-menu"
						menu={{ items: sortMenuItems }}
						placement="bottomLeft"
					>
						<Button
							type="default"
							className="periscope-btn"
							icon={<SortDesc size={14} />}
						>
							Sort
						</Button>
					</Dropdown>

					<Input
						placeholder="Search by name, description, or tags..."
						prefix={<Search size={12} color={Color.BG_VANILLA_400} />}
						value={searchValue}
						onChange={handleSearch}
					/>

					<Dropdown
						overlayClassName="new-dashboard-menu"
						menu={{ items: createDashboardItems }}
						placement="bottomRight"
					>
						<Button type="primary" icon={<Plus size={14} />}>
							New dashboard
						</Button>
					</Dropdown>
				</div>

				<Table
					columns={columns}
					dataSource={data}
					showSorterTooltip
					facingIssueBtn={{
						attributes: {
							screen: 'Dashboard list page',
						},
						eventName: 'Dashboard: Facing Issues in dashboard',
						buttonText: 'Facing issues with dashboards?',
						message: dashboardListMessage,
						onHoverText: 'Click here to get help with dashboards',
					}}
					loading={isDashboardListLoading}
					showHeader={false}
					pagination={{ pageSize: 5 }}
				/>
			</div>
		</div>
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
