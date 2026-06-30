import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';

import styles from './AttributeMappingTabPanel.module.scss';

const noop = (): void => undefined;

function AttributeMappingTabPanel(): JSX.Element {
	// Draft state, mapping-group listing and the save/discard wiring land in the
	// next PRs. For now this is a read-only shell with disabled actions.
	const isDirty = false;
	const isSaving = false;

	return (
		<>
			<div className={styles.actions}>
				{isDirty && (
					<Typography.Text
						color="muted"
						size="small"
						as="span"
						testId="unsaved-changes"
					>
						Unsaved changes
					</Typography.Text>
				)}
				<Button
					variant="outlined"
					color="secondary"
					onClick={noop}
					disabled={!isDirty || isSaving}
					testId="discard-changes-btn"
				>
					Discard
				</Button>
				<Button
					variant="solid"
					color="primary"
					onClick={noop}
					loading={isSaving}
					disabled={!isDirty || isSaving}
					testId="save-changes-btn"
				>
					{isSaving ? 'Saving…' : 'Save changes'}
				</Button>
			</div>

			<div className={styles.tableEmpty} data-testid="attribute-mapping-empty">
				<Typography.Text color="muted">
					No mapping groups configured yet.
				</Typography.Text>
			</div>
		</>
	);
}

export default AttributeMappingTabPanel;
