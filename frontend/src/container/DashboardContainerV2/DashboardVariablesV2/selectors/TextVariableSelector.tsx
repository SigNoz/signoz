import { useEffect, useState } from 'react';
import { Input } from 'antd';

interface Props {
	value: string;
	onCommit: (v: string) => void;
}

/**
 * Text variable input — commits on blur (and on Enter), matching V1's
 * `TextboxVariableInput` UX which avoids re-fetching panels on every
 * keystroke.
 */
function TextVariableSelector({ value, onCommit }: Props): JSX.Element {
	const [draft, setDraft] = useState<string>(value);

	useEffect(() => {
		setDraft(value);
	}, [value]);

	const commit = (): void => {
		if (draft !== value) onCommit(draft);
	};

	return (
		<Input
			className="variable-select"
			value={draft}
			onChange={(e): void => setDraft(e.target.value)}
			onBlur={commit}
			onPressEnter={commit}
			data-testid="text-variable-input-v2"
		/>
	);
}

export default TextVariableSelector;
