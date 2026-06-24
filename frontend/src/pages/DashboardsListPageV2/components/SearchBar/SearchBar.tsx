import { ChangeEvent, KeyboardEvent, MouseEvent } from 'react';
import { Input } from '@signozhq/ui/input';
import { Color } from '@signozhq/design-tokens';
import { CornerDownLeft, Search } from '@signozhq/icons';

import styles from './SearchBar.module.scss';

interface Props {
	value: string;
	onChange: (value: string) => void;
	onSubmit: () => void;
	placeholder?: string;
}

function SearchBar({
	value,
	onChange,
	onSubmit,
	placeholder = "Search with DSL (e.g. name CONTAINS 'foo')",
}: Props): JSX.Element {
	return (
		<Input
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
			onBlur={onSubmit}
			onKeyDown={(e: KeyboardEvent<HTMLInputElement>): void => {
				if (e.key === 'Enter') {
					onSubmit();
				}
			}}
		/>
	);
}

export default SearchBar;
