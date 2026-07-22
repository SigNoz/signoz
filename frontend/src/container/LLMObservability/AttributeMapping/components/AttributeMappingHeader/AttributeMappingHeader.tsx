import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';

import styles from './AttributeMappingHeader.module.scss';

interface AttributeMappingHeaderProps {
	isDirty: boolean;
	isSaving: boolean;
	onDiscard: () => void;
	onSave: () => void;
}

function AttributeMappingHeader({
	isDirty,
	isSaving,
	onDiscard,
	onSave,
}: AttributeMappingHeaderProps): JSX.Element {
	return (
		<header className={styles.pageHeader}>
			<Typography.Text as="p" size="base" color="muted">
				Configure source-to-target attribute remapping for LLM traces
			</Typography.Text>
			{isDirty && (
				<div className={styles.pageHeaderActions}>
					<span className={styles.unsavedChanges} data-testid="unsaved-changes">
						Unsaved changes
					</span>
					<Button
						variant="outlined"
						color="secondary"
						onClick={onDiscard}
						disabled={isSaving}
						testId="discard-changes-btn"
					>
						Discard
					</Button>
					<Button
						variant="solid"
						color="primary"
						onClick={onSave}
						loading={isSaving}
						disabled={isSaving}
						testId="save-changes-btn"
					>
						{isSaving ? 'Saving…' : 'Save changes'}
					</Button>
				</div>
			)}
		</header>
	);
}

export default AttributeMappingHeader;
