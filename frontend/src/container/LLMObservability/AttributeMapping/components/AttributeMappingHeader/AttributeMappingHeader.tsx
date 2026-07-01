import { Button } from '@signozhq/ui/button';

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
			<div className={styles.pageHeaderTitle}>
				<h1 className={styles.title}>Attribute Mapping</h1>
				<p className={styles.description}>
					Configure source-to-target attribute remapping for LLM traces
				</p>
			</div>
			<div className={styles.pageHeaderActions}>
				{isDirty && (
					<span className={styles.unsavedChanges} data-testid="unsaved-changes">
						Unsaved changes
					</span>
				)}
				<Button
					variant="outlined"
					color="secondary"
					onClick={onDiscard}
					disabled={!isDirty || isSaving}
					testId="discard-changes-btn"
				>
					Discard
				</Button>
				<Button
					variant="solid"
					color="primary"
					onClick={onSave}
					loading={isSaving}
					disabled={!isDirty || isSaving}
					testId="save-changes-btn"
				>
					{isSaving ? 'Saving…' : 'Save changes'}
				</Button>
			</div>
		</header>
	);
}

export default AttributeMappingHeader;
