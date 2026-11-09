import { Configure, Plus } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';

import dashboardEmojiUrl from '@/assets/Icons/dashboard_emoji.svg';
import landscapeUrl from '@/assets/Icons/landscape.svg';

import { useCreatePanel } from '../../hooks/useCreatePanel';
import AuthZTooltip from 'lib/authz/components/AuthZTooltip/AuthZTooltip';
import { useDashboardStore } from '../../store/useDashboardStore';
import PanelTypeSelectionModal from '../Panel/PanelTypeSelectionModal/PanelTypeSelectionModal';
import styles from './DashboardEmptyState.module.scss';
import { useDashboardEditContext } from '../../hooks/useDashboardEditContext';

interface DashboardEmptyStateProps {
	canAddPanel: boolean;
}

function DashboardEmptyState({
	canAddPanel,
}: DashboardEmptyStateProps): JSX.Element {
	const { isEditable, editChecks, editDisabledTooltip } =
		useDashboardEditContext();
	const { isPickerOpen, openPicker, closePicker, createPanel } =
		useCreatePanel();
	const requestSettings = useDashboardStore((s) => s.requestSettings);

	return (
		<section className={styles.emptyState}>
			<div className={styles.content}>
				<div className={styles.heading}>
					<img src={dashboardEmojiUrl} alt="" className={styles.emoji} />
					<Typography
						variant="paragraph"
						size="medium"
						weight="medium"
						color="main"
						as="span"
						textOverflow="wrap"
					>
						Welcome to your new dashboard
					</Typography>
					<Typography
						variant="paragraph"
						size="base"
						weight="regular"
						color="tertiary"
						as="span"
						textOverflow="wrap"
					>
						Follow the steps to populate it with data and share with your teammates
					</Typography>
				</div>

				<div className={styles.steps}>
					<div className={styles.step}>
						<div className={styles.stepText}>
							<Configure size={14} className={styles.stepIcon} />
							<div className={styles.stepCopy}>
								<Typography
									variant="paragraph"
									size="base"
									weight="medium"
									color="main"
									as="span"
									textOverflow="wrap"
								>
									Configure your new dashboard
								</Typography>
								<Typography
									variant="paragraph"
									size="base"
									weight="regular"
									color="tertiary"
									as="span"
									textOverflow="wrap"
								>
									Give it a name, add description, tags and variables
								</Typography>
							</div>
						</div>
						<AuthZTooltip checks={editChecks} disabledTooltip={editDisabledTooltip}>
							<Button
								disabledTooltip={undefined}
								size="md"
								variant="solid"
								color="secondary"
								width="140px"
								prefix={<Configure size="md" />}
								disabled={!isEditable}
								onClick={(): void => requestSettings({ tab: 'Overview' })}
								testId="empty-configure"
							>
								Configure
							</Button>
						</AuthZTooltip>
					</div>

					<div className={styles.step}>
						<div className={styles.stepText}>
							<img src={landscapeUrl} alt="" className={styles.stepIcon} />
							<div className={styles.stepCopy}>
								<Typography
									variant="paragraph"
									size="base"
									weight="medium"
									color="main"
									as="span"
									textOverflow="wrap"
								>
									Add panels
								</Typography>
								<Typography
									variant="paragraph"
									size="base"
									weight="regular"
									color="tertiary"
									as="span"
									textOverflow="wrap"
								>
									Add panels to visualize your data
								</Typography>
							</div>
						</div>
						<AuthZTooltip checks={editChecks} disabledTooltip={editDisabledTooltip}>
							<Button
								disabledTooltip={undefined}
								size="md"
								variant="solid"
								color="primary"
								prefix={<Plus size="md" />}
								disabled={!canAddPanel}
								onClick={(): void => openPicker()}
								testId="add-panel"
							>
								New Panel
							</Button>
						</AuthZTooltip>
					</div>
				</div>
			</div>
			<PanelTypeSelectionModal
				open={isPickerOpen}
				onClose={closePicker}
				onSelect={createPanel}
			/>
		</section>
	);
}

export default DashboardEmptyState;
