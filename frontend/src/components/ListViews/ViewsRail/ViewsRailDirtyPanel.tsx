import { Button } from '@signozhq/ui/button';
import { Plus } from '@signozhq/icons';
import cx from 'classnames';

import styles from './ViewsRail.module.scss';

interface Props {
	isCustomActive: boolean;
	testIdPrefix: string;
	onSaveChanges: () => void;
	onSaveAs: () => void;
	onReset: () => void;
}

function ViewsRailDirtyPanel({
	isCustomActive,
	testIdPrefix,
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
					<Button
						variant="outlined"
						color="secondary"
						size="sm"
						onClick={onSaveAs}
						testId={`${testIdPrefix}-view-save-as`}
					>
						Save as…
					</Button>
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
				<Button
					variant="solid"
					color="primary"
					size="sm"
					prefix={<Plus size={12} />}
					onClick={onSaveAs}
					testId={`${testIdPrefix}-view-save-as-new`}
				>
					Save as new view
				</Button>
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
