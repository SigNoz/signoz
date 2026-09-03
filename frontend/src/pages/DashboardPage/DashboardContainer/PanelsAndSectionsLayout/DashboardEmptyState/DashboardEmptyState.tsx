import { Configure, Plus } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';

import dashboardEmojiUrl from '@/assets/Icons/dashboard_emoji.svg';
import landscapeUrl from '@/assets/Icons/landscape.svg';

import { useCreatePanel } from '../../hooks/useCreatePanel';
import { useDashboardStore } from '../../store/useDashboardStore';
import PanelTypeSelectionModal from '../Panel/PanelTypeSelectionModal/PanelTypeSelectionModal';
import styles from './DashboardEmptyState.module.scss';

interface DashboardEmptyStateProps {
	canAddPanel: boolean;
}

function DashboardEmptyState({
	canAddPanel,
}: DashboardEmptyStateProps): JSX.Element {
	const { isPickerOpen, openPicker, closePicker, createPanel } =
		useCreatePanel();
	const isEditable = useDashboardStore((s) => s.isEditable);
	const requestSettings = useDashboardStore((s) => s.requestSettings);

	return (
		<section className={styles.emptyState}>
			<div className={styles.content}>
				<div className={styles.heading}>
					<img src={dashboardEmojiUrl} alt="" className={styles.emoji} />
					<Typography.Text className={styles.welcome}>
						Welcome to your new dashboard
					</Typography.Text>
					<Typography.Text className={styles.welcomeInfo}>
						Follow the steps to populate it with data and share with your teammates
					</Typography.Text>
				</div>

				<div className={styles.steps}>
					<div className={styles.step}>
						<div className={styles.stepText}>
							<Configure size={14} className={styles.stepIcon} />
							<div className={styles.stepCopy}>
								<Typography.Text className={styles.stepTitle}>
									Configure your new dashboard
								</Typography.Text>
								<Typography.Text className={styles.stepInfo}>
									Give it a name, add description, tags and variables
								</Typography.Text>
							</div>
						</div>
						{isEditable && (
							<Button
								variant="solid"
								color="secondary"
								prefix={<Configure size="md" />}
								onClick={(): void => requestSettings({ tab: 'Overview' })}
								testId="empty-configure"
							>
								Configure
							</Button>
						)}
					</div>

					<div className={styles.step}>
						<div className={styles.stepText}>
							<img src={landscapeUrl} alt="" className={styles.stepIcon} />
							<div className={styles.stepCopy}>
								<Typography.Text className={styles.stepTitle}>
									Add panels
								</Typography.Text>
								<Typography.Text className={styles.stepInfo}>
									Add panels to visualize your data
								</Typography.Text>
							</div>
						</div>
						{canAddPanel && (
							<Button
								color="primary"
								prefix={<Plus size="md" />}
								onClick={(): void => openPicker()}
								testId="add-panel"
							>
								New Panel
							</Button>
						)}
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
