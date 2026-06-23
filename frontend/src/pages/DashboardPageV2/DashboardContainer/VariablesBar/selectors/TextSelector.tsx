import { useCallback, useRef, useState } from 'react';
import type { InputRef } from 'antd';
// eslint-disable-next-line signoz/no-antd-components -- match V1 textbox behaviour (commit on blur/Enter, borderless)
import { Input } from 'antd';

import type { VariableSelection } from '../selectionTypes';
import styles from '../VariablesBar.module.scss';

interface TextSelectorProps {
	selection: VariableSelection;
	/** Configured default; an emptied input falls back to it (V1 behaviour). */
	defaultValue?: string;
	onChange: (selection: VariableSelection) => void;
	testId?: string;
}

/**
 * Free-text variable input. Mirrors V1: edits are local and only committed on
 * blur / Enter (not per keystroke), and clearing the field restores the default.
 */
function TextSelector({
	selection,
	defaultValue,
	onChange,
	testId,
}: TextSelectorProps): JSX.Element {
	const inputRef = useRef<InputRef>(null);
	const [value, setValue] = useState<string>(
		typeof selection.value === 'string' ? selection.value : (defaultValue ?? ''),
	);

	const commit = useCallback(
		(next: string): void => onChange({ value: next, allSelected: false }),
		[onChange],
	);

	const handleBlur = useCallback(
		(event: React.FocusEvent<HTMLInputElement>): void => {
			const trimmed = event.target.value.trim();
			if (!trimmed && defaultValue) {
				setValue(defaultValue);
				commit(defaultValue);
			} else {
				commit(trimmed);
			}
		},
		[commit, defaultValue],
	);

	return (
		<Input
			ref={inputRef}
			className={styles.control}
			bordered={false}
			placeholder="Enter value"
			value={value}
			title={value}
			onChange={(e): void => setValue(e.target.value)}
			onBlur={handleBlur}
			onKeyDown={(e): void => {
				if (e.key === 'Enter') {
					inputRef.current?.blur();
				}
			}}
			data-testid={testId}
		/>
	);
}

export default TextSelector;
