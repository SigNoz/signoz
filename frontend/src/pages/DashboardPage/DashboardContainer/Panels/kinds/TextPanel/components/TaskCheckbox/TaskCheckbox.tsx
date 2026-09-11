import { TooltipSimple } from '@signozhq/ui/tooltip';

import { useTaskItemOffset } from '../MarkdownContent/taskItemOffset';

// A tick is an edit to the panel's markdown, not a per-viewer preference — say so
// before it is made, since the surface otherwise reads like an ordinary checkbox.
const WRITE_BACK_HINT = 'Toggling this updates the panel spec';

interface TaskCheckboxProps {
	checked: boolean;
	/** `offset` locates the item in the rendered body. */
	onChange: (checked: boolean, offset: number) => void;
}

/**
 * A GFM task-list checkbox that writes its state back to the panel's markdown.
 * Disabled without an offset from its item: nothing would locate its marker.
 */
function TaskCheckbox({ checked, onChange }: TaskCheckboxProps): JSX.Element {
	const offset = useTaskItemOffset();

	const box = (
		<input
			type="checkbox"
			checked={checked}
			disabled={offset === undefined}
			aria-label="Toggle task item"
			data-testid="markdown-task-checkbox"
			onChange={(event): void => {
				if (offset !== undefined) {
					onChange(event.target.checked, offset);
				}
			}}
		/>
	);

	if (offset === undefined) {
		return box;
	}

	// `asChild` on the trigger keeps the input itself as the hover target, so no
	// wrapper lands inside the body's style reset.
	return (
		<TooltipSimple title={WRITE_BACK_HINT} arrow>
			{box}
		</TooltipSimple>
	);
}

export default TaskCheckbox;
