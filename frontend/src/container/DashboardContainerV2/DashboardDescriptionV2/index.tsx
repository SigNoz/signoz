import { useEffect, useMemo, useState } from 'react';
import { FullScreenHandle } from 'react-full-screen';
import { useTranslation } from 'react-i18next';
import { useCopyToClipboard } from 'react-use';
import {
	Check,
	ClipboardCopy,
	Ellipsis,
	FileJson,
	Fullscreen,
	Globe,
	LockKeyhole,
	PenLine,
	Plus,
	X,
} from '@signozhq/icons';
import { Button, Card, Input, Modal, Popover, Tooltip } from 'antd';
import { Badge } from '@signozhq/ui/badge';
import { toast } from '@signozhq/ui/sonner';
import { Typography } from '@signozhq/ui/typography';
import logEvent from 'api/common/logEvent';
import {
	lockDashboardV2,
	patchDashboardV2,
	unlockDashboardV2,
} from 'api/generated/services/dashboard';
import type { DashboardtypesJSONPatchOperationDTO } from 'api/generated/services/sigNoz.schemas';
import ConfigureIcon from 'assets/Integrations/ConfigureIcon';
import { DeleteButton } from 'container/ListOfDashboard/TableComponents/DeleteButton';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import useComponentPermission from 'hooks/useComponentPermission';
import { isEmpty } from 'lodash-es';
import { useAppContext } from 'providers/App/App';
import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';
import { USER_ROLES } from 'types/roles';

import { Base64Icons } from '../../DashboardContainer/DashboardSettings/General/utils';
import DashboardSettingsV2 from '../DashboardSettings';
import DashboardHeader from '../components/DashboardHeader/DashboardHeader';
import DashboardVariablesV2 from '../DashboardVariablesV2';
import SettingsDrawer from './SettingsDrawer';

import '../../DashboardContainer/DashboardDescription/Description.styles.scss';

import type { V2Dashboard } from '../utils';

interface DashboardDescriptionV2Props {
	dashboard: V2Dashboard | undefined;
	handle: FullScreenHandle;
	onRefetch: () => void;
}

// eslint-disable-next-line sonarjs/cognitive-complexity
function DashboardDescriptionV2(props: DashboardDescriptionV2Props): JSX.Element {
	const { dashboard, handle, onRefetch } = props;

	const id = dashboard?.id ?? '';
	const isDashboardLocked = !!dashboard?.locked;

	const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] =
		useState<boolean>(false);

	const title = dashboard?.spec?.display?.name ?? '';
	const description = dashboard?.spec?.display?.description ?? '';
	const image = dashboard?.image || Base64Icons[0];
	const tags = useMemo(
		() =>
			(dashboard?.tags ?? []).map((t) =>
				t.key === t.value ? t.key : `${t.key}:${t.value}`,
			),
		[dashboard?.tags],
	);
	const dashboardVariables = dashboard?.spec?.variables ?? [];

	const [updatedTitle, setUpdatedTitle] = useState<string>(title);

	const { user } = useAppContext();
	const [editDashboard] = useComponentPermission(['edit_dashboard'], user.role);
	const [isDashboardSettingsOpen, setIsDashbordSettingsOpen] =
		useState<boolean>(false);
	const [isRenameDashboardOpen, setIsRenameDashboardOpen] =
		useState<boolean>(false);

	const isAuthor =
		!!user?.email && !!dashboard?.createdBy && dashboard.createdBy === user.email;
	const addPanelPermission = !isDashboardLocked;
	// V2 public dashboard wiring lives separately; treat as not-public for chrome.
	const isPublicDashboard = false;

	const { showErrorModal } = useErrorModal();
	const { t } = useTranslation(['dashboard', 'common']);

	const [isRenameLoading, setIsRenameLoading] = useState<boolean>(false);

	useEffect(() => {
		if (dashboard) {setUpdatedTitle(title);}
	}, [dashboard, title]);

	const handleLockDashboardToggle = async (): Promise<void> => {
		if (!id) {return;}
		setIsDashbordSettingsOpen(false);
		try {
			if (isDashboardLocked) {
				await unlockDashboardV2({ id });
				toast.success('Dashboard unlocked');
			} else {
				await lockDashboardV2({ id });
				toast.success('Dashboard locked');
			}
			onRefetch();
		} catch (error) {
			showErrorModal(error as APIError);
		}
	};

	const onNameChangeHandler = async (): Promise<void> => {
		const trimmed = updatedTitle.trim();
		if (!id || !trimmed || trimmed === title) {
			setIsRenameDashboardOpen(false);
			return;
		}
		try {
			setIsRenameLoading(true);
			const patch: DashboardtypesJSONPatchOperationDTO[] = [
				{
					op: 'replace' as DashboardtypesJSONPatchOperationDTO['op'],
					path: '/spec/display/name',
					value: trimmed,
				},
			];
			await patchDashboardV2({ id }, patch);
			toast.success('Dashboard renamed successfully');
			setIsRenameDashboardOpen(false);
			onRefetch();
		} catch (error) {
			showErrorModal(error as APIError);
			setIsRenameDashboardOpen(true);
		} finally {
			setIsRenameLoading(false);
		}
	};

	const onEmptyWidgetHandler = (): void => {
		logEvent('Dashboard Detail V2: Add new panel clicked', {
			dashboardId: id,
		});
		toast.info('V2 panel editor coming next');
	};

	const [state, setCopy] = useCopyToClipboard();

	useEffect(() => {
		if (state.error) {
			toast.error(t('something_went_wrong', { ns: 'common' }));
		}
		if (state.value) {
			toast.success(t('success', { ns: 'common' }));
		}
	}, [state.error, state.value, t]);

	const dashboardDataJSON = (): string =>
		JSON.stringify(dashboard ?? {}, null, 2);

	const exportJSON = (): void => {
		const blob = new Blob([dashboardDataJSON()], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `${title || 'dashboard'}.json`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	const onConfigureClick = (): void => {
		setIsSettingsDrawerOpen(true);
	};

	const onSettingsDrawerClose = (): void => {
		setIsSettingsDrawerOpen(false);
	};

	return (
		<Card className="dashboard-description-container">
			<DashboardHeader title={title} image={image} />
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
									{(isAuthor || user.role === USER_ROLES.ADMIN) && (
										<Tooltip
											title={
												dashboard?.createdBy === 'integration' &&
												'Dashboards created by integrations cannot be unlocked'
											}
										>
											<Button
												type="text"
												icon={<LockKeyhole size={14} />}
												disabled={dashboard?.createdBy === 'integration'}
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
									<Button
										type="text"
										icon={<FileJson size={14} />}
										onClick={(): void => {
											exportJSON();
											setIsDashbordSettingsOpen(false);
										}}
									>
										Export JSON
									</Button>
									<Button
										type="text"
										icon={<ClipboardCopy size={14} />}
										onClick={(): void => {
											setCopy(dashboardDataJSON());
											setIsDashbordSettingsOpen(false);
										}}
									>
										Copy as JSON
									</Button>
								</section>
								<section className="delete-dashboard">
									<DeleteButton
										createdBy={dashboard?.createdBy || ''}
										name={title}
										id={id}
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
						<>
							<Button
								type="text"
								className="configure-button"
								icon={<ConfigureIcon />}
								data-testid="show-drawer"
								onClick={onConfigureClick}
							>
								Configure
							</Button>
							<SettingsDrawer
								drawerTitle="Dashboard Configuration"
								isOpen={isSettingsDrawerOpen}
								onClose={onSettingsDrawerClose}
							>
								<DashboardSettingsV2
									dashboard={dashboard}
									onRefetch={onRefetch}
								/>
							</SettingsDrawer>
						</>
					)}
					{!isDashboardLocked && addPanelPermission && (
						<Button
							className="add-panel-btn"
							onClick={onEmptyWidgetHandler}
							icon={<Plus size="md" />}
							type="primary"
							data-testid="add-panel-header"
						>
							New Panel
						</Button>
					)}
				</div>
			</section>
			{tags.length > 0 && (
				<div className="dashboard-tags">
					{tags.map((tag) => (
						<Badge key={tag} className="tag">
							{tag}
						</Badge>
					))}
				</div>
			)}
			{!isEmpty(description) && (
				<section className="dashboard-description-section">{description}</section>
			)}

			{dashboardVariables.length > 0 && (
				<section className="dashboard-variables">
					<DashboardVariablesV2
						dashboardId={id}
						variables={dashboardVariables}
					/>
				</section>
			)}

			<Modal
				open={isRenameDashboardOpen}
				title="Rename Dashboard"
				onOk={onNameChangeHandler}
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
							disabled={isRenameLoading}
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
		</Card>
	);
}

export default DashboardDescriptionV2;
