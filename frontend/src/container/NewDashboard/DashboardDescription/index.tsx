import './Description.styles.scss';

import { PlusOutlined } from '@ant-design/icons';
import { Button, Card, Input, Modal, Popover, Tag, Typography } from 'antd';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import ROUTES from 'constants/routes';
import { DeleteButton } from 'container/ListOfDashboard/TableComponents/DeleteButton';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import { useUpdateDashboard } from 'hooks/dashboard/useUpdateDashboard';
import useComponentPermission from 'hooks/useComponentPermission';
import { useNotifications } from 'hooks/useNotifications';
import history from 'lib/history';
import {
	Check,
	CircleEllipsis,
	ClipboardCopy,
	FileJson,
	FolderKanban,
	Fullscreen,
	LayoutGrid,
	LockKeyhole,
	PenLine,
	Tent,
	X,
} from 'lucide-react';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useCallback, useEffect, useState } from 'react';
import { FullScreenHandle } from 'react-full-screen';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { useCopyToClipboard } from 'react-use';
import { AppState } from 'store/reducers';
import { DashboardData } from 'types/api/dashboard/getAll';
import AppReducer from 'types/reducer/app';
import { ROLES, USER_ROLES } from 'types/roles';
import { ComponentTypes } from 'utils/permission';

import DashboardGraphSlider from '../ComponentsSlider';
import DashboardVariableSelection from '../DashboardVariablesSelection';
import SettingsDrawer from './SettingsDrawer';
import { downloadObjectAsJson } from './utils';

interface DashboardDescriptionProps {
	handle: FullScreenHandle;
}

// eslint-disable-next-line sonarjs/cognitive-complexity
function DashboardDescription(props: DashboardDescriptionProps): JSX.Element {
	const { handle } = props;
	const {
		selectedDashboard,
		isDashboardLocked,
		setSelectedDashboard,
		handleToggleDashboardSlider,
		handleDashboardLockToggle,
	} = useDashboard();

	const selectedData = selectedDashboard
		? {
				...selectedDashboard.data,
				uuid: selectedDashboard.uuid,
		  }
		: ({} as DashboardData);

	const { title = '', description, tags } = selectedData || {};

	const [updatedTitle, setUpdatedTitle] = useState<string>(title);

	const updateDashboardMutation = useUpdateDashboard();

	const { user, role } = useSelector<AppState, AppReducer>((state) => state.app);
	const [editDashboard] = useComponentPermission(['edit_dashboard'], role);
	const [isDashboardSettingsOpen, setIsDashbordSettingsOpen] = useState<boolean>(
		false,
	);

	const [isRenameDashboardOpen, setIsRenameDashboardOpen] = useState<boolean>(
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
			: role;

	const [addPanelPermission] = useComponentPermission(permissions, userRole);

	const onEmptyWidgetHandler = useCallback(() => {
		handleToggleDashboardSlider(true);
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

	return (
		<Card className="dashboard-description-container">
			<section className="dashboard-breadcrumbs">
				<Button
					type="text"
					icon={<LayoutGrid size={14} />}
					className="dashboard-btn"
					onClick={(): void => history.push(ROUTES.ALL_DASHBOARD)}
				>
					Dashboard /
				</Button>
				<Button type="text" className="id-btn" icon={<Tent size={14} />}>
					{title}
				</Button>
			</section>
			<section className="dashbord-details">
				<div className="left-section">
					<Tent size={14} />
					<Typography.Text className="dashboard-title">{title}</Typography.Text>
				</div>
				<div className="right-section">
					<Popover
						open={isDashboardSettingsOpen}
						arrow={false}
						onOpenChange={(visible): void => setIsDashbordSettingsOpen(visible)}
						rootClassName="dashboard-settings"
						content={
							<div className="menu-content">
								<section className="section-1">
									{(isAuthor || role === USER_ROLES.ADMIN) && (
										<Button
											type="text"
											icon={<LockKeyhole size={14} />}
											onClick={handleLockDashboardToggle}
										>
											{isDashboardLocked ? 'Unlock Dashboard' : 'Lock Dashboard'}
										</Button>
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
									{/* <Button type="text" icon={<Copy size={14} />}>
										Duplicate
									</Button> */}
									{!isDashboardLocked && editDashboard && (
										<Button type="text" icon={<FolderKanban size={14} />}>
											New section
										</Button>
									)}

									<Button
										type="text"
										icon={<FileJson size={14} />}
										onClick={(): void => {
											downloadObjectAsJson(selectedData, selectedData.title);
											setIsDashbordSettingsOpen(false);
										}}
									>
										Export JSON
									</Button>
									<Button
										type="text"
										icon={<ClipboardCopy size={14} />}
										onClick={(): void => {
											setCopy(JSON.stringify(selectedData, null, 2));
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
							icon={<CircleEllipsis size={14} />}
							type="text"
							className="icons"
						/>
					</Popover>
					{/**
					 * to be added later when BE supports it
					 */}
					{/* <Tooltip title="Activity">
						<Button icon={<Zap size={14} />} type="text" className="icons" />
					</Tooltip> */}
					<DateTimeSelectionV2 showAutoRefresh hideShareModal />
					{!isDashboardLocked && editDashboard && (
						<SettingsDrawer drawerTitle="Dashboard Configuration" />
					)}
					{!isDashboardLocked && addPanelPermission && (
						<Button
							className="add-panel-btn"
							onClick={onEmptyWidgetHandler}
							icon={<PlusOutlined />}
							type="primary"
							data-testid="add-panel"
						>
							New Panel
						</Button>
					)}
				</div>
			</section>
			<div className="dashboard-tags">
				{tags?.map((tag) => (
					<Tag key={tag} className="tag">
						{tag}
					</Tag>
				))}
			</div>
			<section className="dashboard-description-section">{description}</section>
			<section className="dashboard-variables">
				<DashboardVariableSelection />
			</section>
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
			{/* <Row gutter={16}>
				<Col flex={1} span={9}>
					<Typography.Title
						level={4}
						style={{ padding: 0, margin: 0 }}
						data-testid="dashboard-landing-name"
					>
						{isDashboardLocked && (
							<Tooltip title="Dashboard Locked" placement="top">
								<LockFilled /> &nbsp;
							</Tooltip>
						)}
						{title}
					</Typography.Title>
					{description && (
						<Typography
							className="dashboard-description"
							data-testid="dashboard-landing-desc"
						>
							{description}
						</Typography>
					)}

					{tags && (
						<div style={{ margin: '0.5rem 0' }}>
							{tags?.map((tag) => (
								<Tag key={tag}>{tag}</Tag>
							))}
						</div>
					)}
				</Col>
				<Col span={14}>
					<Row justify="end">
						<DashboardVariableSelection />
					</Row>
				</Col>
				<Col span={1} style={{ textAlign: 'right' }}>
					{selectedData && (
						<ShareModal
							isJSONModalVisible={openDashboardJSON}
							onToggleHandler={onToggleHandler}
							selectedData={selectedData}
						/>
					)}

					<div className="dashboard-actions">
						{!isDashboardLocked && editDashboard && (
							<SettingsDrawer drawerTitle="Dashboard Configuration" />
						)}

						<Tooltip title="Share" placement="left">
							<Button
								className="periscope-btn"
								style={{ width: '100%' }}
								onClick={onToggleHandler}
								icon={<Share2 size={16} />}
							/>
						</Tooltip>

						{(isAuthor || role === USER_ROLES.ADMIN) && (
							<Tooltip
								placement="left"
								title={isDashboardLocked ? 'Unlock Dashboard' : 'Lock Dashboard'}
							>
								<Button
									style={{ width: '100%' }}
									className="periscope-btn"
									onClick={handleLockDashboardToggle}
									icon={isDashboardLocked ? <LockFilled /> : <UnlockFilled />}
								/>
							</Tooltip>
						)}
					</div>
				</Col>
			</Row> */}
		</Card>
	);
}

export default DashboardDescription;
