import { Input } from '@signozhq/ui/input';

import type { VariableSelection } from '../selectionTypes';
import styles from '../VariablesBar.module.scss';

interface TextSelectorProps {
	selection: VariableSelection;
	onChange: (selection: VariableSelection) => void;
	testId?: string;
}

/** Free-text variable input. */
function TextSelector({
	selection,
	onChange,
	testId,
}: TextSelectorProps): JSX.Element {
	return (
		<Input
			className={styles.input}
			value={typeof selection.value === 'string' ? selection.value : ''}
			placeholder="Enter a value"
			onChange={(e): void =>
				onChange({ value: e.target.value, allSelected: false })
			}
			testId={testId}
		/>
	);
}

export default TextSelector;
