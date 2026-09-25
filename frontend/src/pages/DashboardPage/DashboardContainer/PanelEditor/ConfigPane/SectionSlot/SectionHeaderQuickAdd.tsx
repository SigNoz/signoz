import { Plus } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { TooltipSimple } from '@signozhq/ui/tooltip';

interface SectionHeaderQuickAddConfig {
	label: string;
	testId: string;
}

interface SectionHeaderQuickAddProps {
	action: SectionHeaderQuickAddConfig;
	/** Expands the section and runs the editor's registered add handler. */
	onClick: () => void;
}

/** Quick-add control rendered in a configuration section's header, beside the chevron. */
function SectionHeaderQuickAdd({
	action,
	onClick,
}: SectionHeaderQuickAddProps): JSX.Element {
	return (
		<TooltipSimple title="Quick Add" side="top" arrow>
			<Button
				type="button"
				variant="ghost"
				color="secondary"
				size="icon"
				aria-label={action.label}
				// Not `testId`: TooltipTrigger's Slot merge overwrites it with undefined.
				data-testid={action.testId}
				onClick={onClick}
			>
				<Plus size={15} />
			</Button>
		</TooltipSimple>
	);
}

export default SectionHeaderQuickAdd;
