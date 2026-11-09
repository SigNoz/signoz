import { Button } from '@signozhq/ui/button';
import { Plus } from '@signozhq/icons';
import cx from 'classnames';
import ViewNamePopover from 'components/ViewNamePopover/ViewNamePopover';

import styles from './ViewsRail.module.scss';

interface Props {
	isCustomActive: boolean;
	testIdPrefix: string;
	saveTestIdPrefix: string;
	onSaveChanges: () => void;
	onSaveAs: (name: string) => void;
	onReset: () => void;
}

function ViewsRailDirtyPanel({
	isCustomActive,
	testIdPrefix,
	saveTestIdPrefix,
	onSaveChanges,
	onSaveAs,
	onReset,
}: Props): JSX.Element {
	if (isCustomActive) {
		return (
			<div className={styles.dirtyPanel}>
				<div className={styles.dirtyTitle}>Unsaved changes</div>
				<div className={styles.dirtyActions}>
					<Button
						variant="solid"
						color="primary"
						size="sm"
						onClick={onSaveChanges}
						testId={`${testIdPrefix}-view-save-changes`}
					>
						Save
					</Button>
					<ViewNamePopover
						onSubmit={onSaveAs}
						title="Save as view"
						confirmLabel="Save view"
						testIdPrefix={saveTestIdPrefix}
						tooltip="Save current filters as a view"
						trigger={(open): JSX.Element => (
							<Button
								variant="outlined"
								color="secondary"
								size="sm"
								onClick={(e): void => open(e.currentTarget)}
								testId={`${testIdPrefix}-view-save-as`}
							>
								Save as…
							</Button>
						)}
					/>
					<Button
						variant="ghost"
						color="secondary"
						size="sm"
						onClick={onReset}
						testId={`${testIdPrefix}-view-reset`}
					>
						Reset
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className={cx(styles.dirtyPanel, styles.dirtyPanelDefault)}>
			<div className={styles.dirtyTitle}>Filters active</div>
			<div className={styles.dirtyActions}>
				<ViewNamePopover
					onSubmit={onSaveAs}
					title="Save as view"
					confirmLabel="Save view"
					testIdPrefix={saveTestIdPrefix}
					tooltip="Save current filters as a view"
					trigger={(open): JSX.Element => (
						<Button
							variant="solid"
							color="primary"
							size="sm"
							prefix={<Plus size={12} />}
							onClick={(e): void => open(e.currentTarget)}
							testId={`${testIdPrefix}-view-save-as-new`}
						>
							Save as new view
						</Button>
					)}
				/>
				<Button
					variant="ghost"
					color="secondary"
					size="sm"
					onClick={onReset}
					testId={`${testIdPrefix}-view-reset`}
				>
					Reset
				</Button>
			</div>
		</div>
	);
}

export default ViewsRailDirtyPanel;
