import './Description.styles.scss';

import { PlusOutlined } from '@ant-design/icons';
import {
	Button,
	Card,
	Input,
	Modal,
	Popover,
	Tag,
	Tooltip,
	Typography,
} from 'antd';
import logEvent from 'api/common/logEvent';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { QueryParams } from 'constants/query';
import { PANEL_GROUP_TYPES, PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { DeleteButton } from 'container/ListOfDashboard/TableComponents/DeleteButton';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import { useUpdateDashboard } from 'hooks/dashboard/useUpdateDashboard';
import useComponentPermission from 'hooks/useComponentPermission';
import { useNotifications } from 'hooks/useNotifications';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import { isEmpty } from 'lodash-es';
import {
	Check,
	ClipboardCopy,
	Ellipsis,
	FileJson,
	FolderKanban,
	Fullscreen,
	LayoutGrid,
	LockKeyhole,
	PenLine,
	X,
} from 'lucide-react';
import { useAppContext } from 'providers/App/App';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { sortLayout } from 'providers/Dashboard/util';
import { useCallback, useEffect, useState } from 'react';
import { FullScreenHandle } from 'react-full-screen';
import { Layout } from 'react-grid-layout';
import { useTranslation } from 'react-i18next';
import { useCopyToClipboard } from 'react-use';
import {
	Dashboard,
	DashboardData,
	IDashboardVariable,
} from 'types/api/dashboard/getAll';
import { ROLES, USER_ROLES } from 'types/roles';
import { ComponentTypes } from 'utils/permission';
import { v4 as uuid } from 'uuid';

import DashboardGraphSlider from '../ComponentsSlider';
import { Base64Icons } from '../DashboardSettings/General/utils';
import DashboardVariableSelection from '../DashboardVariablesSelection';
import SettingsDrawer from './SettingsDrawer';
import { DEFAULT_ROW_NAME, downloadObjectAsJson } from './utils';

interface DashboardDescriptionProps {
	handle: FullScreenHandle;
}

export function sanitizeDashboardData(
	selectedData: DashboardData,
): Omit<DashboardData, 'uuid'> {
	if (!selectedData?.variables) {
		const { uuid, ...rest } = selectedData;
		return rest;
	}

	const updatedVariables = Object.entries(selectedData.variables).reduce(
		(acc, [key, value]) => {
			const { selectedValue, ...rest } = value;
			acc[key] = rest;
			return acc;
		},
		{} as Record<string, IDashboardVariable>,
	);

	const { uuid, ...restData } = selectedData;
	return {
		...restData,
		variables: updatedVariables,
	};
}

// eslint-disable-next-line sonarjs/cognitive-complexity
function DashboardDescription(props: DashboardDescriptionProps): JSX.Element {
	const { safeNavigate } = useSafeNavigate();
	const { handle } = props;
	const {
		selectedDashboard,
		panelMap,
		setPanelMap,
		layouts,
		setLayouts,
		isDashboardLocked,
		listSortOrder,
		setSelectedDashboard,
		handleToggleDashboardSlider,
		setSelectedRowWidgetId,
		handleDashboardLockToggle,
	} = useDashboard();

	const selectedData = selectedDashboard
		? {
				...selectedDashboard.data,
				uuid: selectedDashboard.uuid,
		  }
		: ({} as DashboardData);

	const { title = '', description, tags, image = Base64Icons[0] } =
		selectedData || {};

	const [updatedTitle, setUpdatedTitle] = useState<string>(title);

	const [sectionName, setSectionName] = useState<string>(DEFAULT_ROW_NAME);

	const updateDashboardMutation = useUpdateDashboard();

	const urlQuery = useUrlQuery();

	const { user } = useAppContext();
	const [editDashboard] = useComponentPermission(['edit_dashboard'], user.role);
	const [isDashboardSettingsOpen, setIsDashbordSettingsOpen] = useState<boolean>(
		false,
	);

	const [isRenameDashboardOpen, setIsRenameDashboardOpen] = useState<boolean>(
		false,
	);

	const [isPanelNameModalOpen, setIsPanelNameModalOpen] = useState<boolean>(
		false,
	);

	let isAuthor = false;

	if (selectedDashboard && user && user.email) {
		isAuthor = selectedDashboard?.created_by === user?.email;
	}

	let permissions: ComponentTypes[] = ['add_panel'];

	if (isDashboardLocked) {
		permissions = ['add_panel_locked_dashboard'];
	}

	const { notifications } = useNotifications();

	const userRole: ROLES | null =
		selectedDashboard?.created_by === user?.email
			? (USER_ROLES.AUTHOR as ROLES)
			: user.role;

	const [addPanelPermission] = useComponentPermission(permissions, userRole);

	const onEmptyWidgetHandler = useCallback(() => {
		setSelectedRowWidgetId(null);
		handleToggleDashboardSlider(true);
		logEvent('Dashboard Detail: Add new panel clicked', {
			dashboardId: selectedDashboard?.uuid,
			dashboardName: selectedDashboard?.data.title,
			numberOfPanels: selectedDashboard?.data.widgets?.length,
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [handleToggleDashboardSlider]);

	const handleLockDashboardToggle = (): void => {
		setIsDashbordSettingsOpen(false);
		handleDashboardLockToggle(!isDashboardLocked);
	};

	const onNameChangeHandler = (): void => {
		if (!selectedDashboard) {
			return;
		}
		const updatedDashboard = {
			...selectedDashboard,
			data: {
				...selectedDashboard.data,
				title: updatedTitle,
			},
		};
		updateDashboardMutation.mutate(updatedDashboard, {
			onSuccess: (updatedDashboard) => {
				notifications.success({
					message: 'Dashboard renamed successfully',
				});
				setIsRenameDashboardOpen(false);
				if (updatedDashboard.payload)
					setSelectedDashboard(updatedDashboard.payload);
			},
			onError: () => {
				notifications.error({
					message: SOMETHING_WENT_WRONG,
				});
				setIsRenameDashboardOpen(true);
			},
		});
	};

	const [state, setCopy] = useCopyToClipboard();

	const { t } = useTranslation(['dashboard', 'common']);

	// used to set the initial value for the updatedTitle
	// the context value is sometimes not available during the initial render
	// due to which the updatedTitle is set to some previous value
	useEffect(() => {
		if (selectedDashboard) {
			setUpdatedTitle(selectedDashboard.data.title);
		}
	}, [selectedDashboard]);

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

	function handleAddRow(): void {
		if (!selectedDashboard) return;
		const id = uuid();

		const newRowWidgetMap: { widgets: Layout[]; collapsed: boolean } = {
			widgets: [],
			collapsed: false,
		};
		const currentRowIdx = 0;
		for (let j = currentRowIdx; j < layouts.length; j++) {
			if (!panelMap[layouts[j].i]) {
				newRowWidgetMap.widgets.push(layouts[j]);
			} else {
				break;
			}
		}

		const updatedDashboard: Dashboard = {
			...selectedDashboard,
			data: {
				...selectedDashboard.data,
				layout: [
					{
						i: id,
						w: 12,
						minW: 12,
						minH: 1,
						maxH: 1,
						x: 0,
						h: 1,
						y: 0,
					},
					...layouts.filter((e) => e.i !== PANEL_TYPES.EMPTY_WIDGET),
				],
				panelMap: { ...panelMap, [id]: newRowWidgetMap },
				widgets: [
					...(selectedDashboard.data.widgets || []),
					{
						id,
						title: sectionName,
						description: '',
						panelTypes: PANEL_GROUP_TYPES.ROW,
					},
				],
			},
			uuid: selectedDashboard.uuid,
		};

		updateDashboardMutation.mutate(updatedDashboard, {
			// eslint-disable-next-line sonarjs/no-identical-functions
			onSuccess: (updatedDashboard) => {
				if (updatedDashboard.payload) {
					if (updatedDashboard.payload.data.layout)
						setLayouts(sortLayout(updatedDashboard.payload.data.layout));
					setSelectedDashboard(updatedDashboard.payload);
					setPanelMap(updatedDashboard.payload?.data?.panelMap || {});
				}

				setIsPanelNameModalOpen(false);
				setSectionName(DEFAULT_ROW_NAME);
			},
			// eslint-disable-next-line sonarjs/no-identical-functions
			onError: () => {
				notifications.error({
					message: SOMETHING_WENT_WRONG,
				});
			},
		});
	}

	function goToListPage(): void {
		urlQuery.set('columnKey', listSortOrder.columnKey as string);
		urlQuery.set('order', listSortOrder.order as string);
		urlQuery.set('page', listSortOrder.pagination as string);
		urlQuery.set('search', listSortOrder.search as string);
		urlQuery.delete(QueryParams.relativeTime);

		const generatedUrl = `${ROUTES.ALL_DASHBOARD}?${urlQuery.toString()}`;
		safeNavigate(generatedUrl);
	}

	return (
		<Card className="dashboard-description-container">
			<div className="dashboard-header">
				<section className="dashboard-breadcrumbs">
					<Button
						type="text"
						icon={<LayoutGrid size={14} />}
						className="dashboard-btn"
						onClick={(): void => goToListPage()}
					>
						Dashboard /
					</Button>
					<Button type="text" className="id-btn dashboard-name-btn">
						<img
							src={image}
							alt="dashboard-icon"
							style={{ height: '14px', width: '14px' }}
						/>
						{title}
					</Button>
				</section>
			</div>
			<section className="dashboard-details">
				<div className="left-section">
					<img src={image} alt="dashboard-img" className="dashboard-img" />
					<Tooltip title={title.length > 30 ? title : ''}>
						<Typography.Text
							className="dashboard-title"
							data-testid="dashboard-title"
						>
							{' '}
							{title}
						</Typography.Text>
					</Tooltip>
					{isDashboardLocked && <LockKeyhole size={14} />}
				</div>
				<div className="right-section">
					<DateTimeSelectionV2 showAutoRefresh hideShareModal />
					<Popover
						open={isDashboardSettingsOpen}
						arrow={false}
						onOpenChange={(visible): void => setIsDashbordSettingsOpen(visible)}
						rootClassName="dashboard-settings"
						content={
							<div className="menu-content">
								<section className="section-1">
									{(isAuthor || user.role === USER_ROLES.ADMIN) && (
										<Tooltip
											title={
												selectedDashboard?.created_by === 'integration' &&
												'Dashboards created by integrations cannot be unlocked'
											}
										>
											<Button
												type="text"
												icon={<LockKeyhole size={14} />}
												disabled={selectedDashboard?.created_by === 'integration'}
												onClick={handleLockDashboardToggle}
												data-testid="lock-unlock-dashboard"
											>
												{isDashboardLocked ? 'Unlock Dashboard' : 'Lock Dashboard'}
											</Button>
										</Tooltip>
									)}

									{!isDashboardLocked && editDashboard && (
										<Button
											type="text"
											icon={<PenLine size={14} />}
											onClick={(): void => {
												setIsRenameDashboardOpen(true);
												setIsDashbordSettingsOpen(false);
											}}
										>
											Rename
										</Button>
									)}

									<Button
										type="text"
										icon={<Fullscreen size={14} />}
										onClick={handle.enter}
									>
										Full screen
									</Button>
								</section>
								<section className="section-2">
									{!isDashboardLocked && addPanelPermission && (
										<Button
											type="text"
											icon={<FolderKanban size={14} />}
											onClick={(): void => {
												setIsPanelNameModalOpen(true);
												setIsDashbordSettingsOpen(false);
											}}
										>
											New section
										</Button>
									)}

									<Button
										type="text"
										icon={<FileJson size={14} />}
										onClick={(): void => {
											downloadObjectAsJson(
												sanitizeDashboardData(selectedData),
												selectedData.title,
											);
											setIsDashbordSettingsOpen(false);
										}}
									>
										Export JSON
									</Button>
									<Button
										type="text"
										icon={<ClipboardCopy size={14} />}
										onClick={(): void => {
											setCopy(
												JSON.stringify(sanitizeDashboardData(selectedData), null, 2),
											);
											setIsDashbordSettingsOpen(false);
										}}
									>
										Copy as JSON
									</Button>
								</section>
								<section className="delete-dashboard">
									<DeleteButton
										createdBy={selectedDashboard?.created_by || ''}
										name={selectedDashboard?.data.title || ''}
										id={String(selectedDashboard?.uuid) || ''}
										isLocked={isDashboardLocked}
										routeToListPage
									/>
								</section>
							</div>
						}
						trigger="click"
						placement="bottomRight"
					>
						<Button
							icon={<Ellipsis size={14} />}
							type="text"
							className="icons"
							data-testid="options"
						/>
					</Popover>
					{!isDashboardLocked && editDashboard && (
						<SettingsDrawer drawerTitle="Dashboard Configuration" />
					)}
					{!isDashboardLocked && addPanelPermission && (
						<Button
							className="add-panel-btn"
							onClick={onEmptyWidgetHandler}
							icon={<PlusOutlined />}
							type="primary"
							data-testid="add-panel-header"
						>
							New Panel
						</Button>
					)}
				</div>
			</section>
			{(tags?.length || 0) > 0 && (
				<div className="dashboard-tags">
					{tags?.map((tag) => (
						<Tag key={tag} className="tag">
							{tag}
						</Tag>
					))}
				</div>
			)}
			{!isEmpty(description) && (
				<section className="dashboard-description-section">{description}</section>
			)}

			{!isEmpty(selectedData.variables) && (
				<section className="dashboard-variables">
					<DashboardVariableSelection />
				</section>
			)}
			<DashboardGraphSlider />

			<Modal
				open={isRenameDashboardOpen}
				title="Rename Dashboard"
				onOk={(): void => {
					// handle update dashboard here
				}}
				onCancel={(): void => {
					setIsRenameDashboardOpen(false);
				}}
				rootClassName="rename-dashboard"
				footer={
					<div className="dashboard-rename">
						<Button
							type="primary"
							icon={<Check size={14} />}
							className="rename-btn"
							onClick={onNameChangeHandler}
							disabled={updateDashboardMutation.isLoading}
						>
							Rename Dashboard
						</Button>
						<Button
							type="text"
							icon={<X size={14} />}
							className="cancel-btn"
							onClick={(): void => setIsRenameDashboardOpen(false)}
						>
							Cancel
						</Button>
					</div>
				}
			>
				<div className="dashboard-content">
					<Typography.Text className="name-text">Enter a new name</Typography.Text>
					<Input
						data-testid="dashboard-name"
						className="dashboard-name-input"
						value={updatedTitle}
						onChange={(e): void => setUpdatedTitle(e.target.value)}
					/>
				</div>
			</Modal>
			<Modal
				open={isPanelNameModalOpen}
				title="New Section"
				rootClassName="section-naming"
				onOk={(): void => handleAddRow()}
				onCancel={(): void => {
					setIsPanelNameModalOpen(false);
					setSectionName(DEFAULT_ROW_NAME);
				}}
				footer={
					<div className="dashboard-rename">
						<Button
							type="primary"
							icon={<Check size={14} />}
							className="rename-btn"
							onClick={(): void => handleAddRow()}
							disabled={updateDashboardMutation.isLoading}
						>
							Create Section
						</Button>
						<Button
							type="text"
							icon={<X size={14} />}
							className="cancel-btn"
							onClick={(): void => {
								setIsPanelNameModalOpen(false);
								setSectionName(DEFAULT_ROW_NAME);
							}}
						>
							Cancel
						</Button>
					</div>
				}
			>
				<div className="section-naming-content">
					<Typography.Text className="name-text">Enter Section name</Typography.Text>
					<Input
						data-testid="section-name"
						className="section-name-input"
						value={sectionName}
						onChange={(e): void => setSectionName(e.target.value)}
					/>
				</div>
			</Modal>
		</Card>
	);
}

export default DashboardDescription;
