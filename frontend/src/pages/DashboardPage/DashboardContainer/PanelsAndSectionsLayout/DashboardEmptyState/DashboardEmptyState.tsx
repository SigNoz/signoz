import { Configure, Plus } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';

import dashboardEmojiUrl from '@/assets/Icons/dashboard_emoji.svg';
import landscapeUrl from '@/assets/Icons/landscape.svg';

import { useCreatePanel } from '../../hooks/useCreatePanel';
import DisabledControlTooltip from '../../components/DisabledControlTooltip/DisabledControlTooltip';
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
	const { isEditable, editDisabledReason, disabledKind } =
		useDashboardEditContext();
	const { isPickerOpen, openPicker, closePicker, createPanel } =
		useCreatePanel();
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
						<DisabledControlTooltip reason={editDisabledReason} kind={disabledKind}>
							<Button
								variant="solid"
								color="secondary"
								prefix={<Configure size="md" />}
								disabled={!isEditable}
								onClick={(): void => requestSettings({ tab: 'Overview' })}
								testId="empty-configure"
							>
								Configure
							</Button>
						</DisabledControlTooltip>
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
						<DisabledControlTooltip reason={editDisabledReason} kind={disabledKind}>
							<Button
								color="primary"
								prefix={<Plus size="md" />}
								disabled={!canAddPanel}
								onClick={(): void => openPicker()}
								testId="add-panel"
							>
								New Panel
							</Button>
						</DisabledControlTooltip>
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
