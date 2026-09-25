import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { AutoComplete, Input } from 'antd';
import type { InputRef } from 'antd';
import { useDashboardVariableNames } from 'pages/DashboardPage/DashboardContainer/hooks/useDashboardVariableNames';

import { DASHBOARD_NAME_MAX_LENGTH } from '../../../constants';
import { findVariableToken, insertVariable } from './variableToken';

import styles from './PanelTitleInput.module.scss';

interface PanelTitleInputProps {
	value: string;
	onChange: (value: string) => void;
}

interface VariableOption {
	/** Whole title after insertion, so antd's change event carries it. */
	value: string;
	label: string;
	cursor: number;
}

function PanelTitleInput({
	value,
	onChange,
}: PanelTitleInputProps): JSX.Element {
	const variableNames = useDashboardVariableNames();
	const inputRef = useRef<InputRef>(null);
	const pendingCursor = useRef<number | null>(null);
	const [cursor, setCursor] = useState(0);
	const [focused, setFocused] = useState(false);
	const [dismissed, setDismissed] = useState(false);

	const options = useMemo<VariableOption[]>(() => {
		const token = findVariableToken(value, cursor);
		if (!token) {
			return [];
		}
		const query = token.query.toLowerCase();
		return variableNames
			.filter((name) => name.toLowerCase().startsWith(query))
			.map((name) => {
				const next = insertVariable(value, token, name);
				return { value: next.text, label: name, cursor: next.cursor };
			});
	}, [value, cursor, variableNames]);

	useLayoutEffect(() => {
		if (pendingCursor.current === null) {
			return;
		}
		inputRef.current?.input?.setSelectionRange(
			pendingCursor.current,
			pendingCursor.current,
		);
		setCursor(pendingCursor.current);
		pendingCursor.current = null;
	}, [value]);

	const syncCursor = (): void => {
		setCursor(inputRef.current?.input?.selectionStart ?? 0);
	};

	const handleChange = (next: string): void => {
		const picked = options.find((option) => option.value === next);
		if (picked) {
			pendingCursor.current = picked.cursor;
			setDismissed(true);
		} else {
			setDismissed(false);
			syncCursor();
		}
		onChange(next);
	};

	const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
		if (event.key === 'Escape') {
			setDismissed(true);
		}
	};

	return (
		<AutoComplete
			className={styles.autoComplete}
			value={value}
			maxLength={DASHBOARD_NAME_MAX_LENGTH}
			options={options}
			open={focused && !dismissed && options.length > 0}
			filterOption={false}
			onChange={handleChange}
		>
			<Input
				ref={inputRef}
				data-testid="panel-editor-v2-title"
				placeholder="Panel title"
				onKeyDown={handleKeyDown}
				onKeyUp={syncCursor}
				onClick={syncCursor}
				onFocus={(): void => setFocused(true)}
				onBlur={(): void => setFocused(false)}
			/>
		</AutoComplete>
	);
}

export default PanelTitleInput;
