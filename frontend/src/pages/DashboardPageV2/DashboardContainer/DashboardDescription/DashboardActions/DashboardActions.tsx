import { useEffect, useState } from 'react';
import { FullScreenHandle } from 'react-full-screen';
import { useTranslation } from 'react-i18next';
import { useCopyToClipboard } from 'react-use';
import {
	ClipboardCopy,
	Ellipsis,
	FileJson,
	Fullscreen,
	LockKeyhole,
	PenLine,
	Plus,
} from '@signozhq/icons';
import { Popover } from 'antd';
import { Button } from '@signozhq/ui/button';
import { toast } from '@signozhq/ui/sonner';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';
import { DeleteButton } from 'container/ListOfDashboard/TableComponents/DeleteButton';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import { useAppContext } from 'providers/App/App';
import { USER_ROLES } from 'types/roles';

import styles from '../DashboardDescription.module.scss';

interface Props {
	dashboard: DashboardtypesGettableDashboardV2DTO;
	handle: FullScreenHandle;
	isDashboardLocked: boolean;
	editDashboard: boolean;
	isAuthor: boolean;
	addPanelPermission: boolean;
	onAddPanel: () => void;
	onLockToggle: () => void;
	onOpenRename: () => void;
}

function DashboardActions({
	dashboard,
	handle,
	isDashboardLocked,
	editDashboard,
	isAuthor,
	addPanelPermission,
	onAddPanel,
	onLockToggle,
	onOpenRename,
}: Props): JSX.Element {
	const { user } = useAppContext();
	const { t } = useTranslation(['dashboard', 'common']);

	const id = dashboard.id;
	const title = dashboard.spec?.display?.name ?? '';

	const [isDashboardSettingsOpen, setIsDashboardSettingsOpen] =
		useState<boolean>(false);

	const [state, setCopy] = useCopyToClipboard();

	useEffect(() => {
		if (state.error) {
			toast.error(t('something_went_wrong', { ns: 'common' }));
		}
		if (state.value) {
			toast.success(t('success', { ns: 'common' }));
		}
	}, [state.error, state.value, t]);

	const dashboardDataJSON = (): string => JSON.stringify(dashboard, null, 2);

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

	return (
		<div className={styles.rightSection}>
			<DateTimeSelectionV2 showAutoRefresh hideShareModal />
			<Popover
				open={isDashboardSettingsOpen}
				arrow={false}
				onOpenChange={(visible): void => setIsDashboardSettingsOpen(visible)}
				rootClassName={styles.dashboardSettings}
				content={
					<div className={styles.menuContent}>
						<section className={styles.section1}>
							{(isAuthor || user.role === USER_ROLES.ADMIN) && (
								<TooltipSimple
									title={
										dashboard.createdBy === 'integration'
											? 'Dashboards created by integrations cannot be unlocked'
											: ''
									}
								>
									<Button
										variant="ghost"
										prefix={<LockKeyhole size={14} />}
										disabled={dashboard.createdBy === 'integration'}
										onClick={(): void => {
											setIsDashboardSettingsOpen(false);
											onLockToggle();
										}}
										testId="lock-unlock-dashboard"
									>
										{isDashboardLocked ? 'Unlock Dashboard' : 'Lock Dashboard'}
									</Button>
								</TooltipSimple>
							)}

							{!isDashboardLocked && editDashboard && (
								<Button
									variant="ghost"
									prefix={<PenLine size={14} />}
									onClick={(): void => {
										onOpenRename();
										setIsDashboardSettingsOpen(false);
									}}
								>
									Rename
								</Button>
							)}

							<Button
								variant="ghost"
								prefix={<Fullscreen size={14} />}
								onClick={handle.enter}
							>
								Full screen
							</Button>
						</section>
						<section className={styles.section2}>
							<Button
								variant="ghost"
								prefix={<FileJson size={14} />}
								onClick={(): void => {
									exportJSON();
									setIsDashboardSettingsOpen(false);
								}}
							>
								Export JSON
							</Button>
							<Button
								variant="ghost"
								prefix={<ClipboardCopy size={14} />}
								onClick={(): void => {
									setCopy(dashboardDataJSON());
									setIsDashboardSettingsOpen(false);
								}}
							>
								Copy as JSON
							</Button>
						</section>
						<section className={styles.deleteDashboard}>
							<DeleteButton
								createdBy={dashboard.createdBy || ''}
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
					variant="ghost"
					size="icon"
					prefix={<Ellipsis size={14} />}
					className={styles.icons}
					testId="options"
				/>
			</Popover>
			{!isDashboardLocked && addPanelPermission && (
				<Button
					variant="solid"
					color="primary"
					className={styles.addPanelBtn}
					onClick={onAddPanel}
					prefix={<Plus size="md" />}
					testId="add-panel-header"
				>
					New Panel
				</Button>
			)}
		</div>
	);
}

export default DashboardActions;
