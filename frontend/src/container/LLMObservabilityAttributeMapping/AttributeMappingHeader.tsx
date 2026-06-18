import { Button } from '@signozhq/ui/button';

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
		<header className="page-header">
			<div className="page-header__title">
				<h1>Attribute Mapping</h1>
				<p>Configure source-to-target attribute remapping for LLM traces</p>
			</div>
			<div className="page-header__actions">
				{isDirty && (
					<span className="page-header__unsaved" data-testid="unsaved-changes">
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
