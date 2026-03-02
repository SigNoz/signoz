import { useCallback, useEffect, useRef, useState } from 'react';
import { FullScreenHandle } from 'react-full-screen';
import { Layout } from 'react-grid-layout';
import { useTranslation } from 'react-i18next';
import { useCopyToClipboard } from 'react-use';
import { PlusOutlined } from '@ant-design/icons';
import { Button as SignozButton } from '@signozhq/button';
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
import ConfigureIcon from 'assets/Integrations/ConfigureIcon';
import { GuardButton } from 'components/PermissionlessButton/PermissionlessButton';
import { PANEL_GROUP_TYPES, PANEL_TYPES } from 'constants/queryBuilder';
import { DeleteButton } from 'container/ListOfDashboard/TableComponents/DeleteButton';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import { useDashboardVariables } from 'hooks/dashboard/useDashboardVariables';
import { useGetPublicDashboardMeta } from 'hooks/dashboard/useGetPublicDashboardMeta';
import { useUpdateDashboard } from 'hooks/dashboard/useUpdateDashboard';
import { buildObjectString } from 'hooks/useAuthZ/utils';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import { useNotifications } from 'hooks/useNotifications';
import { isEmpty } from 'lodash-es';
import {
	Check,
	ClipboardCopy,
	Ellipsis,
	FileJson,
	FolderKanban,
	Fullscreen,
	Globe,
	LockKeyhole,
	PenLine,
	X,
} from 'lucide-react';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { sortLayout } from 'providers/Dashboard/util';
import { DashboardData } from 'types/api/dashboard/getAll';
import { Props } from 'types/api/dashboard/update';
import { v4 as uuid } from 'uuid';

import DashboardHeader from '../components/DashboardHeader/DashboardHeader';
import DashboardGraphSlider from '../ComponentsSlider';
import DashboardSettings from '../DashboardSettings';
import { Base64Icons } from '../DashboardSettings/General/utils';
import DashboardVariableSelection from '../DashboardVariablesSelection';
import SettingsDrawer from './SettingsDrawer';
import { VariablesSettingsTab } from './types';
import {
	DEFAULT_ROW_NAME,
	downloadObjectAsJson,
	sanitizeDashboardData,
} from './utils';

import './Description.styles.scss';

interface DashboardDescriptionProps {
	handle: FullScreenHandle;
}

// eslint-disable-next-line sonarjs/cognitive-complexity
function DashboardDescription(props: DashboardDescriptionProps): JSX.Element {
	const { handle } = props;
	const {
		selectedDashboard,
		panelMap,
		setPanelMap,
		layouts,
		setLayouts,
		isDashboardLocked,
		setSelectedDashboard,
		handleToggleDashboardSlider,
		setSelectedRowWidgetId,
		handleDashboardLockToggle,
	} = useDashboard();

	const variablesSettingsTabHandle = useRef<VariablesSettingsTab>(null);
	const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState<boolean>(
		false,
	);

	const { isCloudUser, isEnterpriseSelfHostedUser } = useGetTenantLicense();

	const isPublicDashboardEnabled = isCloudUser || isEnterpriseSelfHostedUser;

	const selectedData = selectedDashboard
		? {
				...selectedDashboard.data,
				uuid: selectedDashboard.id,
		  }
		: ({} as DashboardData);
	const { dashboardVariables } = useDashboardVariables();

	const { title = '', description, tags, image = Base64Icons[0] } =
		selectedData || {};

	const [updatedTitle, setUpdatedTitle] = useState<string>(title);

	const [sectionName, setSectionName] = useState<string>(DEFAULT_ROW_NAME);

	const updateDashboardMutation = useUpdateDashboard();

	const [isDashboardSettingsOpen, setIsDashbordSettingsOpen] = useState<boolean>(
		false,
	);

	const [isRenameDashboardOpen, setIsRenameDashboardOpen] = useState<boolean>(
		false,
	);

	const [isPanelNameModalOpen, setIsPanelNameModalOpen] = useState<boolean>(
		false,
	);

	const [isPublicDashboard, setIsPublicDashboard] = useState<boolean>(false);

	const { notifications } = useNotifications();

	const onEmptyWidgetHandler = useCallback(() => {
		setSelectedRowWidgetId(null);
		handleToggleDashboardSlider(true);
		logEvent('Dashboard Detail: Add new panel clicked', {
			dashboardId: selectedDashboard?.id,
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
		const updatedDashboard: Props = {
			id: selectedDashboard.id,

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
				if (updatedDashboard.data) {
					setSelectedDashboard(updatedDashboard.data);
				}
			},
			onError: () => {
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
		if (!selectedDashboard) {
			return;
		}
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

		const updatedDashboard: Props = {
			id: selectedDashboard.id,

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
		};

		updateDashboardMutation.mutate(updatedDashboard, {
			onSuccess: (updatedDashboard) => {
				if (updatedDashboard.data) {
					if (updatedDashboard.data.data.layout) {
						setLayouts(sortLayout(updatedDashboard.data.data.layout));
					}
					setSelectedDashboard(updatedDashboard.data);
					setPanelMap(updatedDashboard.data?.data?.panelMap || {});
				}

				setIsPanelNameModalOpen(false);
				setSectionName(DEFAULT_ROW_NAME);
			},
		});
	}

	const {
		data: publicDashboardResponse,
		isLoading: isLoadingPublicDashboardData,
		isFetching: isFetchingPublicDashboardData,
		error: errorPublicDashboardData,
		isError: isErrorPublicDashboardData,
	} = useGetPublicDashboardMeta(
		selectedDashboard?.id || '',
		!!selectedDashboard?.id && isPublicDashboardEnabled,
	);

	useEffect(() => {
		if (!isLoadingPublicDashboardData && !isFetchingPublicDashboardData) {
			if (isErrorPublicDashboardData) {
				const errorDetails = errorPublicDashboardData?.getErrorDetails();

				if (errorDetails?.error?.code === 'public_dashboard_not_found') {
					setIsPublicDashboard(false);
				}
			} else {
				const publicDashboardData = publicDashboardResponse?.data;
				if (publicDashboardData?.publicPath) {
					setIsPublicDashboard(true);
				}
			}
		}
	}, [
		isLoadingPublicDashboardData,
		isFetchingPublicDashboardData,
		isErrorPublicDashboardData,
		errorPublicDashboardData,
		publicDashboardResponse?.data,
	]);

	const onConfigureClick = useCallback((): void => {
		setIsSettingsDrawerOpen(true);
	}, []);

	const onSettingsDrawerClose = useCallback((): void => {
		setIsSettingsDrawerOpen(false);
		// good use case for a state library like Jotai
		if (variablesSettingsTabHandle.current) {
			variablesSettingsTabHandle.current.resetState();
		}
	}, []);

	return (
		<Card className="dashboard-description-container">
			<DashboardHeader />
			<section className="dashboard-details">
				<div className="left-section">
					<img src={image} alt="dashboard-img" className="dashboard-img" />
					<Tooltip title={title.length > 30 ? title : ''}>
						<Typography.Text
							className="dashboard-title"
							data-testid="dashboard-title"
						>
							{title}
						</Typography.Text>
					</Tooltip>

					{isPublicDashboard && (
						<Tooltip title="This dashboard is publicly accessible">
							<Globe size={14} className="public-dashboard-icon" />
						</Tooltip>
					)}

					{isDashboardLocked && (
						<Tooltip title="This dashboard is locked">
							<LockKeyhole size={14} className="lock-dashboard-icon" />
						</Tooltip>
					)}
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
									<GuardButton
										relation="update"
										object={buildObjectString('dashboard', selectedDashboard?.id || '')}
										variant="ghost"
										className="w-full justify-start px-2 gap-2"
										prefixIcon={<LockKeyhole />}
										onClick={handleLockDashboardToggle}
										tooltipTitle={
											selectedDashboard?.createdBy === 'integration'
												? 'Dashboards created by integrations cannot be unlocked'
												: undefined
										}
										disabled={selectedDashboard?.createdBy === 'integration'}
										tooltipDisabled={selectedDashboard?.createdBy !== 'integration'}
									>
										{isDashboardLocked ? 'Unlock Dashboard' : 'Lock Dashboard'}
									</GuardButton>

									<GuardButton
										relation="update"
										object={buildObjectString('dashboard', selectedDashboard?.id || '')}
										variant="ghost"
										className="w-full justify-start px-2 gap-2"
										prefixIcon={<PenLine />}
										onClick={(): void => {
											setIsRenameDashboardOpen(true);
											setIsDashbordSettingsOpen(false);
										}}
										tooltipTitle={
											isDashboardLocked
												? `You can't rename a locked dashboard.`
												: undefined
										}
										tooltipDisabled={!isDashboardLocked}
										disabled={isDashboardLocked}
									>
										Rename
									</GuardButton>

									<SignozButton
										variant="ghost"
										className="w-full justify-start px-2 gap-2"
										prefixIcon={<Fullscreen />}
										onClick={handle.enter}
									>
										Full screen
									</SignozButton>
								</section>
								<section className="section-2">
									<GuardButton
										relation="update"
										object={buildObjectString('dashboard', selectedDashboard?.id || '')}
										variant="ghost"
										className="w-full justify-start px-2 gap-2"
										prefixIcon={<FolderKanban />}
										tooltipTitle={
											isDashboardLocked
												? `You can't add panel to a locked dashboard.`
												: undefined
										}
										disabled={isDashboardLocked}
										tooltipDisabled={!isDashboardLocked}
										onClick={(): void => {
											setIsPanelNameModalOpen(true);
											setIsDashbordSettingsOpen(false);
										}}
									>
										New section
									</GuardButton>

									<GuardButton
										relation="read"
										object={buildObjectString('dashboard', selectedDashboard?.id || '')}
										variant="ghost"
										className="w-full justify-start px-2 gap-2"
										prefixIcon={<FileJson />}
										onClick={(): void => {
											downloadObjectAsJson(
												sanitizeDashboardData(selectedData),
												selectedData.title,
											);
											setIsDashbordSettingsOpen(false);
										}}
									>
										Export JSON
									</GuardButton>

									<GuardButton
										relation="read"
										object={buildObjectString('dashboard', selectedDashboard?.id || '')}
										variant="ghost"
										className="w-full justify-start px-2 gap-2"
										prefixIcon={<ClipboardCopy />}
										onClick={(): void => {
											setCopy(
												JSON.stringify(sanitizeDashboardData(selectedData), null, 2),
											);
											setIsDashbordSettingsOpen(false);
										}}
									>
										Copy as JSON
									</GuardButton>
								</section>
								<section className="delete-dashboard">
									<DeleteButton
										createdBy={selectedDashboard?.createdBy || ''}
										name={selectedDashboard?.data.title || ''}
										id={String(selectedDashboard?.id) || ''}
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
					<GuardButton
						relation="update"
						object={buildObjectString('dashboard', selectedDashboard?.id || '')}
						variant="ghost"
						prefixIcon={<ConfigureIcon />}
						className="configure-button"
						data-testid="show-drawer"
						onClick={onConfigureClick}
						tooltipTitle={
							isDashboardLocked ? `You can't configure a locked dashboard.` : undefined
						}
						tooltipDisabled={!isDashboardLocked}
						disabled={isDashboardLocked}
					>
						Configure
					</GuardButton>
					<SettingsDrawer
						drawerTitle="Dashboard Configuration"
						isOpen={isSettingsDrawerOpen}
						onClose={onSettingsDrawerClose}
					>
						<DashboardSettings
							variablesSettingsTabHandle={variablesSettingsTabHandle}
						/>
					</SettingsDrawer>
					<GuardButton
						relation="update"
						object={buildObjectString('dashboard', selectedDashboard?.id || '')}
						className="add-panel-btn"
						onClick={onEmptyWidgetHandler}
						variant="solid"
						color="primary"
						prefixIcon={<PlusOutlined />}
						data-testid="add-panel-header"
						tooltipTitle={
							isDashboardLocked
								? `You can't add panel to a locked dashboard.`
								: undefined
						}
						disabled={isDashboardLocked}
						tooltipDisabled={!isDashboardLocked}
					>
						New Panel
					</GuardButton>
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

			{!isEmpty(dashboardVariables) && (
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
