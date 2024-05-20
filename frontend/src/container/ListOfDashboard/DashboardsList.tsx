/* eslint-disable no-nested-ternary */
/* eslint-disable jsx-a11y/img-redundant-alt */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
import './DashboardList.styles.scss';

import { MoreOutlined, SmallDashOutlined } from '@ant-design/icons';
import { Color } from '@signozhq/design-tokens';
import {
	Button,
	Dropdown,
	Input,
	MenuProps,
	Modal,
	Popover,
	Skeleton,
	Switch,
	Table,
	Tag,
	Tooltip,
	Typography,
} from 'antd';
import { TableProps } from 'antd/lib';
import createDashboard from 'api/dashboard/create';
import { AxiosError } from 'axios';
import cx from 'classnames';
import { ENTITY_VERSION_V4 } from 'constants/app';
import ROUTES from 'constants/routes';
import { Base64Icons } from 'container/NewDashboard/DashboardSettings/General/utils';
import dayjs from 'dayjs';
import { useGetAllDashboard } from 'hooks/dashboard/useGetAllDashboard';
import useComponentPermission from 'hooks/useComponentPermission';
import { useNotifications } from 'hooks/useNotifications';
import history from 'lib/history';
import { get, isEmpty } from 'lodash-es';
import {
	ArrowDownWideNarrow,
	ArrowUpRight,
	CalendarClock,
	Check,
	Clock4,
	Expand,
	HdmiPort,
	LayoutGrid,
	Link2,
	Plus,
	Radius,
	RotateCw,
	Search,
} from 'lucide-react';
import { handleContactSupport } from 'pages/Integrations/utils';
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
import { useCopyToClipboard } from 'react-use';
import { AppState } from 'store/reducers';
import { Dashboard } from 'types/api/dashboard/getAll';
import AppReducer from 'types/reducer/app';
import { isCloudUser } from 'utils/app';

import useUrlQuery from '../../hooks/useUrlQuery';
import DashboardTemplatesModal from './DashboardTemplates/DashboardTemplatesModal';
import ImportJSON from './ImportJSON';
import { DeleteButton } from './TableComponents/DeleteButton';
import {
	DashboardDynamicColumns,
	DynamicColumns,
	filterDashboard,
} from './utils';

// eslint-disable-next-line sonarjs/cognitive-complexity
function DashboardsList(): JSX.Element {
	const {
		data: dashboardListResponse = [],
		isLoading: isDashboardListLoading,
		error: dashboardFetchError,
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
	const [isConfigureMetadataOpen, setIsConfigureMetadata] = useState<boolean>(
		false,
	);

	const params = useUrlQuery();
	const orderColumnParam = params.get('columnKey');
	const orderQueryParam = params.get('order');
	const paginationParam = params.get('page');
	const searchParams = params.get('search');
	const [searchString, setSearchString] = useState<string>(searchParams || '');

	const [sortOrder, setSortOrder] = useState({
		columnKey: orderColumnParam,
		order: orderQueryParam,
		pagination: paginationParam,
	});

	const getLocalStorageDynamicColumns = (): DashboardDynamicColumns => {
		const dashboardDynamicColumnsString = localStorage.getItem('dashboard');
		let dashboardDynamicColumns: DashboardDynamicColumns = {
			createdAt: false,
			createdBy: false,
			updatedAt: false,
			updatedBy: false,
		};
		if (typeof dashboardDynamicColumnsString === 'string') {
			try {
				const tempDashboardDynamicColumns = JSON.parse(
					dashboardDynamicColumnsString,
				);

				if (isEmpty(tempDashboardDynamicColumns)) {
					localStorage.setItem('dashboard', JSON.stringify(dashboardDynamicColumns));
				} else {
					dashboardDynamicColumns = { ...tempDashboardDynamicColumns };
				}
			} catch (error) {
				console.error(error);
			}
		} else {
			localStorage.setItem('dashboard', JSON.stringify(dashboardDynamicColumns));
		}

		return dashboardDynamicColumns;
	};

	const [visibleColumns, setVisibleColumns] = useState<DashboardDynamicColumns>(
		() => getLocalStorageDynamicColumns(),
	);

	function setDynamicColumnsLocalStorage(
		visibleColumns: DashboardDynamicColumns,
	): void {
		try {
			localStorage.setItem('dashboard', JSON.stringify(visibleColumns));
		} catch (error) {
			console.error(error);
		}
	}

	const [dashboards, setDashboards] = useState<Dashboard[]>();

	const sortDashboardsByCreatedAt = (dashboards: Dashboard[]): void => {
		const sortedDashboards = dashboards.sort(
			(a, b) =>
				new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
		);
		setDashboards(sortedDashboards);
	};

	const sortDashboardsByUpdatedAt = (dashboards: Dashboard[]): void => {
		const sortedDashboards = dashboards.sort(
			(a, b) =>
				new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
		);
		setDashboards(sortedDashboards);
	};

	useEffect(() => {
		params.set('columnKey', sortOrder.columnKey as string);
		params.set('order', sortOrder.order as string);
		params.set('page', sortOrder.pagination || '1');
		history.replace({ search: params.toString() });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [sortOrder]);

	const sortHandle = (key: string): void => {
		console.log(dashboards);
		if (!dashboards) return;
		if (key === 'createdAt') {
			sortDashboardsByCreatedAt(dashboards);
			setSortOrder({
				columnKey: 'createdAt',
				order: 'descend',
				pagination: sortOrder.pagination || '1',
			});
		} else if (key === 'updatedAt') {
			sortDashboardsByUpdatedAt(dashboards);
			setSortOrder({
				columnKey: 'updatedAt',
				order: 'descend',
				pagination: sortOrder.pagination || '1',
			});
		}
	};

	function handlePageSizeUpdate(page: number): void {
		setSortOrder((order) => ({
			...order,
			pagination: String(page),
		}));
	}

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
			image: e.data.image || Base64Icons[0],
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

	const [state, setCopy] = useCopyToClipboard();

	const { notifications } = useNotifications();

	useEffect(() => {
		if (state.error) {
			notifications.error({
				message: t('something_went_wrong', {
					ns: 'common',
				}),
			});
		}

		if (state.value) {
			notifications.success({
				message: t('success', {
					ns: 'common',
				}),
			});
		}
	}, [state.error, state.value, t, notifications]);

	function getFormattedTime(dashboard: Dashboard, option: string): string {
		const timeOptions: Intl.DateTimeFormatOptions = {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: false,
		};
		const formattedTime = new Date(get(dashboard, option, '')).toLocaleTimeString(
			'en-US',
			timeOptions,
		);

		const dateOptions: Intl.DateTimeFormatOptions = {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		};

		const formattedDate = new Date(get(dashboard, option, '')).toLocaleDateString(
			'en-US',
			dateOptions,
		);

		// Combine time and date
		return `${formattedDate} ⎯ ${formattedTime}`;
	}

	const onLastUpdated = (time: string): string => {
		const currentTime = dayjs();

		const lastRefresh = dayjs(time);

		const secondsDiff = currentTime.diff(lastRefresh, 'seconds');

		const minutedDiff = currentTime.diff(lastRefresh, 'minutes');
		const hoursDiff = currentTime.diff(lastRefresh, 'hours');
		const daysDiff = currentTime.diff(lastRefresh, 'days');
		const monthsDiff = currentTime.diff(lastRefresh, 'months');

		if (monthsDiff > 0) {
			return `Last Updated ${monthsDiff} months ago`;
		}

		if (daysDiff > 0) {
			return `Last Updated ${daysDiff} days ago`;
		}

		if (hoursDiff > 0) {
			return `Last Updated ${hoursDiff} hrs ago`;
		}

		if (minutedDiff > 0) {
			return `Last Updated ${minutedDiff} mins ago`;
		}

		return `Last Updated ${secondsDiff} sec ago`;
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
								<img
									src={dashboard?.image || Base64Icons[0]}
									style={{ height: '14px', width: '14px' }}
									alt="dashboard-image"
								/>
								<Typography.Text>{dashboard.name}</Typography.Text>
							</div>

							<div className="tags-with-actions">
								{dashboard?.tags && dashboard.tags.length > 0 && (
									<div className="dashboard-tags">
										{dashboard.tags.map((tag) => (
											<Tag className="tag" key={tag}>
												{tag}
											</Tag>
										))}
									</div>
								)}
								{action && (
									<Popover
										trigger="hover"
										content={
											<div className="dashboard-action-content">
												<section className="section-1">
													<Button
														type="text"
														className="action-btn"
														icon={<Expand size={14} />}
														onClick={onClickHandler}
													>
														View
													</Button>
													<Button
														type="text"
														className="action-btn"
														icon={<Link2 size={14} />}
														onClick={(e): void => {
															e.stopPropagation();
															e.preventDefault();
															setCopy(`${window.location.origin}${getLink()}`);
														}}
													>
														Copy Link
													</Button>
												</section>
												<section className="section-2">
													<DeleteButton
														name={dashboard.name}
														id={dashboard.id}
														isLocked={dashboard.isLocked}
														createdBy={dashboard.createdBy}
													/>
												</section>
											</div>
										}
										placement="bottomRight"
										arrow={false}
										rootClassName="dashboard-actions"
									>
										<MoreOutlined />
									</Popover>
								)}
							</div>
						</div>
						<div className="dashboard-details">
							{visibleColumns.createdAt && (
								<div className="dashboard-created-at">
									<CalendarClock size={14} />
									<Typography.Text>{formattedDateAndTime}</Typography.Text>
								</div>
							)}

							{dashboard.createdBy && visibleColumns.createdBy && (
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
							{visibleColumns.updatedAt && (
								<div className="dashboard-created-at" style={{ marginLeft: '8px' }}>
									<CalendarClock size={14} />
									<Typography.Text>
										{onLastUpdated(dashboard.lastUpdatedTime)}
									</Typography.Text>
								</div>
							)}

							{dashboard.lastUpdatedBy && visibleColumns.updatedBy && (
								<>
									<div className="dashboard-tag">
										<Typography.Text className="tag-text">
											{dashboard.lastUpdatedBy?.substring(0, 1).toUpperCase()}
										</Typography.Text>
									</div>
									<Typography.Text className="dashboard-created-by">
										{dashboard.lastUpdatedBy}
									</Typography.Text>
								</>
							)}
						</div>
					</div>
				);
			},
		},
	];

	const getCreateDashboardItems = useMemo(() => {
		const menuItems: MenuProps['items'] = [
			{
				label: (
					<div
						className="create-dashboard-menu-item"
						onClick={(): void => onModalHandler(false)}
					>
						<Radius size={14} /> Import JSON
					</div>
				),
				key: '1',
			},
		];

		if (createNewDashboard) {
			menuItems.unshift({
				label: (
					<div
						className="create-dashboard-menu-item"
						onClick={(): void => {
							onNewDashboardHandler();
						}}
					>
						<LayoutGrid size={14} /> Create dashboard
					</div>
				),
				key: '0',
			});
		}

		return menuItems;
	}, [createNewDashboard, onNewDashboardHandler]);

	return (
		<div className="dashboards-list-container">
			<div className="dashboards-list-view-content">
				<div className="dashboards-list-title-container">
					<Typography.Title className="title">Dashboards</Typography.Title>
					<Typography.Text className="subtitle">
						Create and manage dashboards for your workspace.
					</Typography.Text>
				</div>

				{isDashboardListLoading || isFilteringDashboards ? (
					<div className="loading-dashboard-details">
						<Skeleton.Input active size="large" className="skeleton-1" />
						<Skeleton.Input active size="large" className="skeleton-1" />
						<Skeleton.Input active size="large" className="skeleton-1" />
						<Skeleton.Input active size="large" className="skeleton-1" />
					</div>
				) : dashboardFetchError ? (
					<div className="dashboard-error-state">
						<img
							src="/Icons/awwSnap.svg"
							alt="something went wrong"
							className="error-img"
						/>

						<Typography.Text className="error-text">
							Something went wrong :/ Please retry or contact support.
						</Typography.Text>
						<section className="action-btns">
							<Button
								className="retry-btn"
								type="text"
								icon={<RotateCw size={16} />}
								onClick={(): Promise<any> => refetchDashboardList()}
							>
								Retry
							</Button>
							<Button
								type="text"
								className="learn-more"
								onClick={(): void => handleContactSupport(isCloudUser())}
							>
								Contact Support
							</Button>
							<ArrowUpRight size={16} className="learn-more-arrow" />
						</section>
					</div>
				) : dashboards?.length === 0 ? (
					<div className="dashboard-empty-state">
						<img
							src="/Icons/dashboards.svg"
							alt="dashboards"
							className="dashboard-img"
						/>
						<section className="text">
							<Typography.Text className="no-dashboard">
								No dashboards yet.{' '}
							</Typography.Text>
							<Typography.Text className="info">
								Create a dashboard to start visualizing your data
							</Typography.Text>
						</section>

						{createNewDashboard && (
							<section className="actions">
								<Dropdown
									overlayClassName="new-dashboard-menu"
									menu={{ items: getCreateDashboardItems }}
									placement="bottomRight"
									trigger={['click']}
								>
									<Button
										type="text"
										className="new-dashboard"
										icon={<Plus size={14} />}
									>
										New Dashboard
									</Button>
								</Dropdown>
								<Button type="text" className="learn-more">
									Learn more
								</Button>
								<ArrowUpRight size={16} className="learn-more-arrow" />
							</section>
						)}
					</div>
				) : (
					<>
						<div className="dashboards-list-header-container">
							{/* TODO add filters
							 */}
							{/* <Dropdown
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
							</Dropdown> */}
							<Input
								placeholder="Search by name, description, or tags..."
								prefix={<Search size={12} color={Color.BG_VANILLA_400} />}
								value={searchValue}
								onChange={handleSearch}
							/>
							{createNewDashboard && (
								<Dropdown
									overlayClassName="new-dashboard-menu"
									menu={{ items: getCreateDashboardItems }}
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
							)}
						</div>
						<div className="all-dashboards-header">
							<Typography.Text className="typography">All Dashboards</Typography.Text>
							<section className="right-actions">
								<Tooltip title="Sort">
									<Popover
										trigger="click"
										content={
											<div className="sort-content">
												<Typography.Text className="sort-heading">Sort By</Typography.Text>
												<Button
													type="text"
													className={cx('sort-btns')}
													onClick={(): void => sortHandle('createdAt')}
												>
													Last created
													{sortOrder.columnKey === 'createdAt' && <Check size={14} />}
												</Button>
												<Button
													type="text"
													className={cx('sort-btns')}
													onClick={(): void => sortHandle('updatedAt')}
												>
													Last updated
													{sortOrder.columnKey === 'updatedAt' && <Check size={14} />}
												</Button>
											</div>
										}
										rootClassName="sort-dashboards"
										placement="bottomRight"
										arrow={false}
									>
										<ArrowDownWideNarrow size={14} />
									</Popover>
								</Tooltip>
								<Popover
									trigger="click"
									content={
										<div className="configure-content">
											<Button
												type="text"
												icon={<HdmiPort size={14} />}
												className="configure-btn"
												onClick={(e): void => {
													e.preventDefault();
													e.stopPropagation();
													setIsConfigureMetadata(true);
												}}
											>
												Configure metadata
											</Button>
										</div>
									}
									rootClassName="configure-group"
									placement="bottomRight"
									arrow={false}
								>
									<SmallDashOutlined />
								</Popover>
							</section>
						</div>

						<Table
							columns={columns}
							dataSource={data}
							showSorterTooltip
							loading={isDashboardListLoading || isFilteringDashboards}
							showHeader={false}
							pagination={{
								pageSize: 5,
								showSizeChanger: false,
								onChange: (page): void => handlePageSizeUpdate(page),
								defaultCurrent: Number(sortOrder.pagination) || 1,
							}}
						/>
					</>
				)}
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

				<Modal
					open={isConfigureMetadataOpen}
					onCancel={(): void => {
						setIsConfigureMetadata(false);
						// reset to default if the changes are not applied
						setVisibleColumns(getLocalStorageDynamicColumns());
					}}
					title="Configure Metadata"
					footer={
						<Button
							type="text"
							icon={<Check size={14} />}
							className="save-changes"
							onClick={(): void => {
								setIsConfigureMetadata(false);
								setDynamicColumnsLocalStorage(visibleColumns);
							}}
						>
							Save Changes
						</Button>
					}
					rootClassName="configure-metadata-root"
				>
					<div className="configure-content">
						<div className="configure-preview">
							<section className="header">
								<img
									src={dashboards?.[0]?.data?.image || Base64Icons[0]}
									alt="dashboard-image"
									style={{ height: '14px', width: '14px' }}
								/>
								<Typography.Text className="title">
									{dashboards?.[0]?.data?.title}
								</Typography.Text>
							</section>
							<section className="details">
								<section className="createdAt">
									{visibleColumns.createdAt && (
										<Typography.Text className="formatted-time">
											<CalendarClock size={14} />
											{getFormattedTime(dashboards?.[0] as Dashboard, 'created_at')}
										</Typography.Text>
									)}
									{visibleColumns.createdBy && (
										<div className="user">
											<Typography.Text className="user-tag">
												{dashboards?.[0]?.created_by?.substring(0, 1).toUpperCase()}
											</Typography.Text>
											<Typography.Text className="dashboard-created-by">
												{dashboards?.[0]?.created_by}
											</Typography.Text>
										</div>
									)}
								</section>
								<section className="updatedAt">
									{visibleColumns.updatedAt && (
										<Typography.Text className="formatted-time">
											<CalendarClock size={14} />
											{onLastUpdated(dashboards?.[0]?.updated_by || '')}
										</Typography.Text>
									)}
									{visibleColumns.updatedBy && (
										<div className="user">
											<Typography.Text className="user-tag">
												{dashboards?.[0]?.updated_by?.substring(0, 1).toUpperCase()}
											</Typography.Text>
											<Typography.Text className="dashboard-created-by">
												{dashboards?.[0]?.updated_by}
											</Typography.Text>
										</div>
									)}
								</section>
							</section>
						</div>
						<div className="metadata-action">
							<div className="left">
								<CalendarClock size={14} />
								<Typography.Text>Created at</Typography.Text>
							</div>
							<div className="connection-line" />
							<div className="right">
								<Switch
									size="small"
									checked={visibleColumns.createdAt}
									onChange={(check): void =>
										setVisibleColumns((prev) => ({
											...prev,
											[DynamicColumns.CREATED_AT]: check,
										}))
									}
								/>
							</div>
						</div>
						<div className="metadata-action">
							<div className="left">
								<CalendarClock size={14} />
								<Typography.Text>Created by</Typography.Text>
							</div>
							<div className="connection-line" />
							<div className="right">
								<Switch
									size="small"
									checked={visibleColumns.createdBy}
									onChange={(check): void =>
										setVisibleColumns((prev) => ({
											...prev,
											[DynamicColumns.CREATED_BY]: check,
										}))
									}
								/>
							</div>
						</div>
						<div className="metadata-action">
							<div className="left">
								<Clock4 size={14} />
								<Typography.Text>Updated at</Typography.Text>
							</div>
							<div className="connection-line" />
							<div className="right">
								<Switch
									size="small"
									checked={visibleColumns.updatedAt}
									onChange={(check): void =>
										setVisibleColumns((prev) => ({
											...prev,
											[DynamicColumns.UPDATED_AT]: check,
										}))
									}
								/>
							</div>
						</div>
						<div className="metadata-action">
							<div className="left">
								<Clock4 size={14} />
								<Typography.Text>Updated by</Typography.Text>
							</div>
							<div className="connection-line" />
							<div className="right">
								<Switch
									size="small"
									checked={visibleColumns.updatedBy}
									onChange={(check): void =>
										setVisibleColumns((prev) => ({
											...prev,
											[DynamicColumns.UPDATED_BY]: check,
										}))
									}
								/>
							</div>
						</div>
					</div>
				</Modal>
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
	image?: string;
}

export default DashboardsList;
