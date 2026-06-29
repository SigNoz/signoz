import { Plus } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';

import dashboardEmojiUrl from '@/assets/Icons/dashboard_emoji.svg';
import landscapeUrl from '@/assets/Icons/landscape.svg';

import { useCreatePanel } from '../../hooks/useCreatePanel';
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

				<div className={styles.addPanel}>
					<div className={styles.addPanelText}>
						<img src={landscapeUrl} alt="" className={styles.icon} />
						<div className={styles.addPanelCopy}>
							<Typography.Text className={styles.addPanelTitle}>
								Add panels
							</Typography.Text>
							<Typography.Text className={styles.addPanelInfo}>
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
			<PanelTypeSelectionModal
				open={isPickerOpen}
				onClose={closePicker}
				onSelect={createPanel}
			/>
		</section>
	);
}

export default DashboardEmptyState;
