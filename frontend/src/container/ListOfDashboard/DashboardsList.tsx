/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
import './DashboardList.styles.scss';

import { Color } from '@signozhq/design-tokens';
import {
	Button,
	Dropdown,
	Input,
	MenuProps,
	Table,
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
	LayoutGrid,
	PencilRuler,
	Plus,
	Radius,
	Search,
	SortDesc,
} from 'lucide-react';
import { ChangeEvent, Key, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { generatePath } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { Dashboard } from 'types/api/dashboard/getAll';
import { ViewProps } from 'types/api/saveViews/types';
import AppReducer from 'types/reducer/app';
import { USER_ROLES } from 'types/roles';

import useSortableTable from '../../hooks/ResizeTable/useSortableTable';
import useUrlQuery from '../../hooks/useUrlQuery';
import { GettableAlert } from '../../types/api/alerts/get';
import DashboardTemplatesModal from './DashboardTemplates/DashboardTemplatesModal';
import ImportJSON from './ImportJSON';
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
	const [
		showNewDashboardTemplatesModal,
		setShowNewDashboardTemplatesModal,
	] = useState(false);

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

	const onModalHandler = (uploadedGrafana: boolean): void => {
		setIsImportJSONModalVisible((state) => !state);
		setUploadedGrafana(uploadedGrafana);
	};

	const handleSearch = (event: ChangeEvent<HTMLInputElement>): void => {
		setIsFilteringDashboards(true);
		setSearchValue(event.target.value);
		const searchText = (event as React.BaseSyntheticEvent)?.target?.value || '';
		const filteredDashboards = filterDashboard(searchText, dashboardListResponse);
		setDashboards(filteredDashboards);
		setIsFilteringDashboards(false);
		setSearchString(searchText);
	};

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

				// const isEditDeleteSupported = allowedRoles.includes(role as string);

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

	const filterMenuItems: MenuProps['items'] = [
		{
			label: (
				<div className="create-dashboard-menu-item">
					{' '}
					<PencilRuler size={14} /> Created by
				</div>
			),
			key: '0',
		},
		{
			label: (
				<div className="create-dashboard-menu-item">
					{' '}
					<CalendarClockIcon size={14} /> Last updated by
				</div>
			),
			key: '1',
		},
	];

	const createDashboardItems: MenuProps['items'] = [
		{
			label: (
				<div
					className="create-dashboard-menu-item"
					onClick={(): void => {
						setShowNewDashboardTemplatesModal(true);
					}}
				>
					{' '}
					<LayoutGrid size={14} /> Create dashboard
				</div>
			),
			key: '0',
		},
		{
			label: (
				<div
					className="create-dashboard-menu-item"
					onClick={(): void => onModalHandler(false)}
				>
					{' '}
					<Radius size={14} /> Import JSON{' '}
				</div>
			),
			key: '1',
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
						menu={{ items: filterMenuItems }}
						placement="bottomLeft"
					>
						<Button
							type="default"
							className="periscope-btn"
							icon={<SortDesc size={14} />}
						>
							Filter
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
						trigger={['click']}
					>
						<Button
							type="primary"
							className="periscope-btn primary"
							icon={<Plus size={14} />}
						>
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
					loading={isDashboardListLoading || isFilteringDashboards}
					showHeader={false}
					pagination={{ pageSize: 5, showSizeChanger: false }}
				/>

				<ImportJSON
					isImportJSONModalVisible={isImportJSONModalVisible}
					uploadedGrafana={uploadedGrafana}
					onModalHandler={(): void => onModalHandler(false)}
				/>

				<DashboardTemplatesModal
					showNewDashboardTemplatesModal={showNewDashboardTemplatesModal}
					onCreateNewDashboard={onNewDashboardHandler}
					onCancel={(): void => {
						setShowNewDashboardTemplatesModal(false);
					}}
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
