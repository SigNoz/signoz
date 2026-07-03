import {
	ChangeEvent,
	KeyboardEvent,
	MouseEvent,
	useMemo,
	useState,
} from 'react';
import { Button } from '@signozhq/ui/button';
import { Input } from '@signozhq/ui/input';
import { Color } from '@signozhq/design-tokens';
import { CornerDownLeft, Search } from '@signozhq/icons';
import cx from 'classnames';

import {
	applyKeySuggestion,
	getActiveKeyToken,
	matchKeys,
} from '../../utils/dslSuggestions';

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
	// -1 means nothing is highlighted, so Enter submits the typed query rather
	// than picking a suggestion (arrow keys engage selection).
	const [highlighted, setHighlighted] = useState(-1);

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
		setHighlighted(-1);
	};

	const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
		if (showSuggestions && e.key === 'ArrowDown') {
			e.preventDefault();
			setHighlighted((h) => Math.min(h + 1, suggestions.length - 1));
			return;
		}
		if (showSuggestions && e.key === 'ArrowUp') {
			e.preventDefault();
			setHighlighted((h) => Math.max(h - 1, 0));
			return;
		}
		if (e.key === 'Enter') {
			if (showSuggestions && highlighted >= 0) {
				e.preventDefault();
				pickSuggestion(suggestions[highlighted]);
			} else {
				onSubmit();
			}
			return;
		}
		if (e.key === 'Escape') {
			setFocused(false);
			setHighlighted(-1);
		}
	};

	return (
		<div className={styles.wrapper}>
			<Input
				className={cx(styles.input, { [styles.inputOpen]: showSuggestions })}
				placeholder={placeholder}
				prefix={<Search size={12} color={Color.BG_VANILLA_400} />}
				suffix={
					<Button
						variant="ghost"
						color="secondary"
						size="icon"
						className={styles.submit}
						aria-label="Run search"
						testId="dashboards-list-search-submit"
						onMouseDown={(e: MouseEvent<HTMLButtonElement>): void => {
							// Prevent the input's blur from firing first and double-submitting.
							e.preventDefault();
						}}
						onClick={onSubmit}
					>
						<CornerDownLeft size={12} color={Color.BG_VANILLA_400} />
					</Button>
				}
				value={value}
				testId="dashboards-list-search"
				onChange={(e: ChangeEvent<HTMLInputElement>): void => {
					onChange(e.target.value);
					setHighlighted(-1);
				}}
				onFocus={(): void => setFocused(true)}
				onBlur={(): void => {
					setFocused(false);
					setHighlighted(-1);
					onSubmit();
				}}
				onKeyDown={handleKeyDown}
			/>
			{showSuggestions && (
				<div
					className={styles.suggestions}
					data-testid="dashboards-list-search-suggestions"
				>
					{suggestions.map((key, index) => (
						<button
							key={key}
							type="button"
							className={cx(styles.suggestion, {
								[styles.suggestionActive]: index === highlighted,
							})}
							data-testid={`dashboards-list-search-suggestion-${key}`}
							onMouseEnter={(): void => setHighlighted(index)}
							onMouseDown={(e: MouseEvent<HTMLButtonElement>): void => {
								// Keep focus on the input so blur doesn't submit before we update.
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
