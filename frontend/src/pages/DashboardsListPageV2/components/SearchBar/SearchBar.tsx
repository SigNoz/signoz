import { ChangeEvent, KeyboardEvent, MouseEvent, useMemo, useState } from 'react';
import { Input } from '@signozhq/ui/input';
import { Color } from '@signozhq/design-tokens';
import { CornerDownLeft, Search } from '@signozhq/icons';

import {
	applyKeySuggestion,
	getActiveKeyToken,
	matchKeys,
} from '../../dslSuggestions';

import styles from './SearchBar.module.scss';

interface Props {
	value: string;
	onChange: (value: string) => void;
	onSubmit: () => void;
	placeholder?: string;
	// Keys offered as you type (reserved DSL columns + tag keys from the API).
	suggestionKeys?: string[];
}

function SearchBar({
	value,
	onChange,
	onSubmit,
	placeholder = "Search with DSL (e.g. name CONTAINS 'foo')",
	suggestionKeys = [],
}: Props): JSX.Element {
	const [focused, setFocused] = useState(false);

	const active = useMemo(() => getActiveKeyToken(value), [value]);
	const suggestions = useMemo(
		() => (active ? matchKeys(suggestionKeys, active.token) : []),
		[active, suggestionKeys],
	);
	const showSuggestions = focused && suggestions.length > 0;

	const pickSuggestion = (key: string): void => {
		if (active) {
			onChange(applyKeySuggestion(value, active, key));
		}
	};

	return (
		<div className={styles.wrapper}>
			<Input
				className={styles.input}
				placeholder={placeholder}
				prefix={<Search size={12} color={Color.BG_VANILLA_400} />}
				suffix={
					<button
						type="button"
						className={styles.submit}
						aria-label="Run search"
						data-testid="dashboards-list-search-submit"
						onMouseDown={(e: MouseEvent<HTMLButtonElement>): void => {
							// Prevent the input's blur from firing first and double-submitting.
							e.preventDefault();
						}}
						onClick={onSubmit}
					>
						<CornerDownLeft size={12} color={Color.BG_VANILLA_400} />
					</button>
				}
				value={value}
				testId="dashboards-list-search"
				onChange={(e: ChangeEvent<HTMLInputElement>): void =>
					onChange(e.target.value)
				}
				onFocus={(): void => setFocused(true)}
				onBlur={(): void => {
					setFocused(false);
					onSubmit();
				}}
				onKeyDown={(e: KeyboardEvent<HTMLInputElement>): void => {
					if (e.key === 'Enter') {
						onSubmit();
					} else if (e.key === 'Escape') {
						setFocused(false);
					}
				}}
			/>
			{showSuggestions && (
				<div className={styles.suggestions} data-testid="dashboards-list-search-suggestions">
					{suggestions.map((key) => (
						<button
							key={key}
							type="button"
							className={styles.suggestion}
							data-testid={`dashboards-list-search-suggestion-${key}`}
							onMouseDown={(e: MouseEvent<HTMLButtonElement>): void => {
								// Keep focus on the input so the dropdown stays usable and blur
								// doesn't submit before the value updates.
								e.preventDefault();
							}}
							onClick={(): void => pickSuggestion(key)}
						>
							{key}
						</button>
					))}
				</div>
			)}
		</div>
	);
}

export default SearchBar;
