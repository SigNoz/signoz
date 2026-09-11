import { useTaskItemOffset } from './taskItemOffset';

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

	return (
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
}

export default TaskCheckbox;
